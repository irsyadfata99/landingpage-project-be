import { Request, Response } from "express";
import { query } from "../config/db";
import { CreateReviewBody, ReviewFilter } from "../types/review.types";
import { ApiResponse, PaginatedResponse } from "../types/response.types";

// ==========================================
// POST /api/reviews (public)
// Hanya customer dengan order status DONE
// ==========================================
export const createReview = async (
  req: Request<object, object, CreateReviewBody>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const { product_id, order_id, customer_email, rating, comment } = req.body;

    // 1. Validasi order: harus DONE dan milik customer tersebut
    const orderResult = await query(
      `SELECT id, status, customer_email
       FROM orders
       WHERE id = $1 AND customer_email = $2`,
      [order_id, customer_email.toLowerCase()],
    );

    if (orderResult.rowCount === 0) {
      res.status(404).json({
        success: false,
        message: "Order tidak ditemukan atau bukan milik Anda",
      });
      return;
    }

    if (orderResult.rows[0].status !== "DONE") {
      res.status(400).json({
        success: false,
        message:
          "Review hanya bisa diberikan setelah pesanan selesai (status DONE)",
      });
      return;
    }

    // 2. Validasi produk ada di order tersebut
    const itemResult = await query(
      `SELECT id FROM order_items
       WHERE order_id = $1 AND product_id = $2`,
      [order_id, product_id],
    );

    if (itemResult.rowCount === 0) {
      res.status(400).json({
        success: false,
        message: "Produk ini tidak ada dalam order Anda",
      });
      return;
    }

    // 3. Cek apakah sudah pernah review produk ini di order ini
    const existingReview = await query(
      `SELECT id FROM product_reviews
       WHERE product_id = $1 AND order_id = $2 AND customer_email = $3`,
      [product_id, order_id, customer_email.toLowerCase()],
    );

    if (existingReview.rowCount! > 0) {
      res.status(400).json({
        success: false,
        message: "Anda sudah memberikan review untuk produk ini",
      });
      return;
    }

    // 4. Ambil customer_name dari order
    const customerName = await query(
      "SELECT customer_name FROM orders WHERE id = $1",
      [order_id],
    );

    // 5. Simpan review
    const result = await query(
      `INSERT INTO product_reviews
        (product_id, order_id, customer_name, customer_email, rating, comment, is_approved)
       VALUES ($1,$2,$3,$4,$5,$6,FALSE) RETURNING *`,
      [
        product_id,
        order_id,
        customerName.rows[0].customer_name,
        customer_email.toLowerCase(),
        rating,
        comment ?? null,
      ],
    );

    res.status(201).json({
      success: true,
      message: "Review berhasil dikirim, menunggu moderasi admin",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("createReview error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// GET /api/reviews/:productId (public)
// Hanya review yang sudah diapprove
// ==========================================
export const getProductReviews = async (
  req: Request<{ productId: string }>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const result = await query(
      `SELECT
        id, customer_name, rating, comment, created_at
       FROM product_reviews
       WHERE product_id = $1 AND is_approved = TRUE
       ORDER BY created_at DESC`,
      [req.params.productId],
    );

    // Hitung rata-rata rating
    const statsResult = await query(
      `SELECT
        COUNT(*) AS total_reviews,
        ROUND(AVG(rating), 1) AS average_rating,
        COUNT(*) FILTER (WHERE rating = 5) AS star_5,
        COUNT(*) FILTER (WHERE rating = 4) AS star_4,
        COUNT(*) FILTER (WHERE rating = 3) AS star_3,
        COUNT(*) FILTER (WHERE rating = 2) AS star_2,
        COUNT(*) FILTER (WHERE rating = 1) AS star_1
       FROM product_reviews
       WHERE product_id = $1 AND is_approved = TRUE`,
      [req.params.productId],
    );

    const stats = statsResult.rows[0];

    res.json({
      success: true,
      message: "OK",
      data: {
        stats: {
          total_reviews: Number(stats.total_reviews),
          average_rating: Number(stats.average_rating) || 0,
          star_5: Number(stats.star_5),
          star_4: Number(stats.star_4),
          star_3: Number(stats.star_3),
          star_2: Number(stats.star_2),
          star_1: Number(stats.star_1),
        },
        reviews: result.rows,
      },
    });
  } catch (err) {
    console.error("getProductReviews error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// GET /api/admin/reviews (admin)
// Semua review + filter
// ==========================================
export const getAllReviews = async (
  req: Request<object, object, object, ReviewFilter>,
  res: Response<PaginatedResponse<object>>,
): Promise<void> => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (req.query.product_id) {
      conditions.push(`pr.product_id = $${idx++}`);
      params.push(req.query.product_id);
    }
    if (req.query.is_approved !== undefined) {
      conditions.push(`pr.is_approved = $${idx++}`);
      params.push(req.query.is_approved);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await query(
      `SELECT COUNT(*) FROM product_reviews pr ${where}`,
      params,
    );
    const total = Number(countResult.rows[0].count);

    const dataResult = await query(
      `SELECT
        pr.*,
        p.name AS product_name
       FROM product_reviews pr
       LEFT JOIN products p ON p.id = pr.product_id
       ${where}
       ORDER BY pr.created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      [...params, limit, offset],
    );

    res.json({
      success: true,
      message: "OK",
      data: dataResult.rows,
      pagination: { total, page, limit, total_pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("getAllReviews error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      data: [],
      pagination: { total: 0, page: 1, limit: 20, total_pages: 0 },
    });
  }
};

// ==========================================
// PATCH /api/admin/reviews/:id/approve (admin)
// ==========================================
export const approveReview = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const result = await query(
      `UPDATE product_reviews SET is_approved = TRUE
       WHERE id = $1 RETURNING *`,
      [req.params.id],
    );

    if (result.rowCount === 0) {
      res
        .status(404)
        .json({ success: false, message: "Review tidak ditemukan" });
      return;
    }

    res.json({
      success: true,
      message: "Review berhasil diapprove",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("approveReview error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// DELETE /api/admin/reviews/:id (admin)
// ==========================================
export const deleteReview = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const result = await query(
      "DELETE FROM product_reviews WHERE id = $1 RETURNING id",
      [req.params.id],
    );

    if (result.rowCount === 0) {
      res
        .status(404)
        .json({ success: false, message: "Review tidak ditemukan" });
      return;
    }

    res.json({ success: true, message: "Review berhasil dihapus" });
  } catch (err) {
    console.error("deleteReview error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
