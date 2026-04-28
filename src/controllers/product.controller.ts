import { Request, Response } from "express";
import { query } from "../config/db";
import { CreateProductBody, UpdateProductBody } from "../types/product.types";
import { ApiResponse, PaginatedResponse } from "../types/response.types";
import { deleteFile, getFileUrl } from "../middlewares/upload.middleware";

// ==========================================
// GET /api/products (public)
// ==========================================
export const getPublicProducts = async (
  _req: Request,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const result = await query(
      `SELECT id, name, description, price, original_price,
              product_type, stock, image_url, is_active, sort_order
       FROM products
       WHERE is_active = TRUE
       ORDER BY sort_order ASC, created_at ASC`,
    );

    res.json({ success: true, message: "OK", data: result.rows });
  } catch (err) {
    console.error("getPublicProducts error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// GET /api/admin/products (admin)
// ==========================================
export const getAllProducts = async (
  req: Request,
  res: Response<PaginatedResponse<object>>,
): Promise<void> => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const countResult = await query("SELECT COUNT(*) FROM products");
    const total = Number(countResult.rows[0].count);

    const result = await query(
      `SELECT * FROM products ORDER BY sort_order ASC, created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    res.json({
      success: true,
      message: "OK",
      data: result.rows,
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("getAllProducts error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      data: [],
      pagination: { total: 0, page: 1, limit: 10, total_pages: 0 },
    });
  }
};

// ==========================================
// GET /api/admin/products/:id (admin)
// ==========================================
export const getProductById = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const result = await query("SELECT * FROM products WHERE id = $1", [
      req.params.id,
    ]);

    if (result.rowCount === 0) {
      res
        .status(404)
        .json({ success: false, message: "Produk tidak ditemukan" });
      return;
    }

    res.json({ success: true, message: "OK", data: result.rows[0] });
  } catch (err) {
    console.error("getProductById error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// POST /api/admin/products (admin)
// ==========================================
export const createProduct = async (
  req: Request<object, object, CreateProductBody>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const {
      name,
      description,
      price,
      original_price,
      product_type,
      stock,
      download_url,
      download_expires_hours,
      is_active,
      sort_order,
    } = req.body;

    if (!name || price === undefined || !product_type) {
      res
        .status(400)
        .json({
          success: false,
          message: "name, price, product_type wajib diisi",
        });
      return;
    }

    const image_url = req.file ? getFileUrl(req.file.filename) : null;

    const result = await query(
      `INSERT INTO products
        (name, description, price, original_price, product_type, stock,
         image_url, download_url, download_expires_hours, is_active, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        name,
        description ?? null,
        price,
        original_price ?? null,
        product_type,
        stock ?? null,
        image_url,
        download_url ?? null,
        download_expires_hours ?? 24,
        is_active ?? true,
        sort_order ?? 0,
      ],
    );

    res
      .status(201)
      .json({
        success: true,
        message: "Produk berhasil dibuat",
        data: result.rows[0],
      });
  } catch (err) {
    console.error("createProduct error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// PUT /api/admin/products/:id (admin)
// ==========================================
export const updateProduct = async (
  req: Request<{ id: string }, object, UpdateProductBody>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await query("SELECT * FROM products WHERE id = $1", [id]);
    if (existing.rowCount === 0) {
      res
        .status(404)
        .json({ success: false, message: "Produk tidak ditemukan" });
      return;
    }

    const old = existing.rows[0];
    const {
      name,
      description,
      price,
      original_price,
      product_type,
      stock,
      download_url,
      download_expires_hours,
      is_active,
      sort_order,
    } = req.body;

    // Jika ada upload gambar baru, hapus yang lama
    let image_url = old.image_url;
    if (req.file) {
      if (old.image_url) deleteFile(old.image_url);
      image_url = getFileUrl(req.file.filename);
    }

    const result = await query(
      `UPDATE products SET
        name = $1, description = $2, price = $3, original_price = $4,
        product_type = $5, stock = $6, image_url = $7, download_url = $8,
        download_expires_hours = $9, is_active = $10, sort_order = $11
       WHERE id = $12
       RETURNING *`,
      [
        name ?? old.name,
        description ?? old.description,
        price ?? old.price,
        original_price ?? old.original_price,
        product_type ?? old.product_type,
        stock ?? old.stock,
        image_url,
        download_url ?? old.download_url,
        download_expires_hours ?? old.download_expires_hours,
        is_active ?? old.is_active,
        sort_order ?? old.sort_order,
        id,
      ],
    );

    res.json({
      success: true,
      message: "Produk berhasil diupdate",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("updateProduct error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// DELETE /api/admin/products/:id (admin)
// ==========================================
export const deleteProduct = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const result = await query(
      "DELETE FROM products WHERE id = $1 RETURNING image_url",
      [req.params.id],
    );

    if (result.rowCount === 0) {
      res
        .status(404)
        .json({ success: false, message: "Produk tidak ditemukan" });
      return;
    }

    // Hapus gambar jika ada
    if (result.rows[0].image_url) deleteFile(result.rows[0].image_url);

    res.json({ success: true, message: "Produk berhasil dihapus" });
  } catch (err) {
    console.error("deleteProduct error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// PATCH /api/admin/products/:id/toggle (admin)
// ==========================================
export const toggleProduct = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const result = await query(
      `UPDATE products SET is_active = NOT is_active
       WHERE id = $1 RETURNING id, name, is_active`,
      [req.params.id],
    );

    if (result.rowCount === 0) {
      res
        .status(404)
        .json({ success: false, message: "Produk tidak ditemukan" });
      return;
    }

    const { name, is_active } = result.rows[0];
    res.json({
      success: true,
      message: `Produk "${name}" ${is_active ? "diaktifkan" : "dinonaktifkan"}`,
      data: result.rows[0],
    });
  } catch (err) {
    console.error("toggleProduct error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
