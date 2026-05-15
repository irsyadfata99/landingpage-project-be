import { Request, Response } from "express";
import { query } from "../config/db";
import { ApiResponse } from "../types/response.types";

// ==========================================
// GET /api/stats (public)
// Mengembalikan:
//   - total_buyers : COUNT orders PAID/PROCESSING/SHIPPED/DELIVERED/DONE
//   - average_rating: AVG rating dari product_reviews yang is_approved = TRUE
//   - total_reviews : COUNT product_reviews yang is_approved = TRUE
//
// Response di-cache 1 jam via Cache-Control header agar tidak
// query DB setiap request dari landing page.
// ==========================================
export const getPublicStats = async (
  _req: Request,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const [buyersResult, ratingResult] = await Promise.all([
      // COUNT semua order yang sudah terbayar (tidak termasuk PENDING/EXPIRED/REFUNDED)
      query(`
        SELECT COUNT(*) AS total_buyers
        FROM orders
        WHERE status IN ('PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'DONE')
      `),

      // AVG rating + COUNT review yang sudah diapprove admin
      query(`
        SELECT
          ROUND(AVG(rating), 1) AS average_rating,
          COUNT(*)              AS total_reviews
        FROM product_reviews
        WHERE is_approved = TRUE
      `),
    ]);

    const totalBuyers = Number(buyersResult.rows[0].total_buyers);
    const averageRating = Number(ratingResult.rows[0].average_rating) || 0;
    const totalReviews = Number(ratingResult.rows[0].total_reviews);

    // Cache 1 jam di sisi client / CDN
    res.setHeader(
      "Cache-Control",
      "public, max-age=3600, stale-while-revalidate=300",
    );

    res.json({
      success: true,
      message: "OK",
      data: {
        total_buyers: totalBuyers,
        average_rating: averageRating,
        total_reviews: totalReviews,
      },
    });
  } catch (err) {
    console.error("getPublicStats error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
