import { Request, Response } from "express";
import { query } from "../config/db";
import { ApiResponse } from "../types/response.types";

// ==========================================
// GET /api/admin/analytics/summary
// ==========================================
export const getAnalyticsSummary = async (
  _req: Request,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const [
      overviewResult,
      ordersByStatusResult,
      revenueMonthlyResult,
      topProductsResult,
      conversionResult,
    ] = await Promise.all([
      // ==========================================
      // OVERVIEW: total revenue, total orders
      // ==========================================
      query(`
        SELECT
          COUNT(*) AS total_orders,
          COALESCE(SUM(CASE WHEN status IN ('PAID','PROCESSING','SHIPPED','DELIVERED','DONE')
            THEN total_amount - discount_amount ELSE 0 END), 0) AS total_revenue,
          COALESCE(SUM(CASE WHEN status IN ('PAID','PROCESSING','SHIPPED','DELIVERED','DONE')
            THEN total_amount - discount_amount ELSE 0 END)
            FILTER (WHERE paid_at >= DATE_TRUNC('month', NOW())), 0) AS revenue_this_month,
          COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW())) AS orders_this_month
        FROM orders
      `),

      // ==========================================
      // ORDERS BY STATUS
      // ==========================================
      query(`
        SELECT status, COUNT(*) AS count
        FROM orders
        GROUP BY status
        ORDER BY status ASC
      `),

      // ==========================================
      // REVENUE PER BULAN (12 bulan terakhir)
      // ==========================================
      query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', paid_at), 'YYYY-MM') AS month,
          TO_CHAR(DATE_TRUNC('month', paid_at), 'Mon YYYY') AS month_label,
          COUNT(*) AS total_orders,
          SUM(total_amount - discount_amount) AS total_revenue
        FROM orders
        WHERE status IN ('PAID','PROCESSING','SHIPPED','DELIVERED','DONE')
          AND paid_at IS NOT NULL
          AND paid_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', paid_at)
        ORDER BY DATE_TRUNC('month', paid_at) ASC
      `),

      // ==========================================
      // TOP 5 PRODUK TERLARIS
      // ==========================================
      query(`
        SELECT
          p.id,
          p.name,
          p.product_type,
          p.price,
          p.image_url,
          COALESCE(SUM(oi.quantity), 0) AS total_sold,
          COALESCE(SUM(oi.subtotal), 0) AS total_revenue
        FROM products p
        LEFT JOIN order_items oi ON oi.product_id = p.id
          AND oi.order_id IN (
            SELECT id FROM orders
            WHERE status IN ('PAID','PROCESSING','SHIPPED','DELIVERED','DONE')
          )
        GROUP BY p.id
        ORDER BY total_sold DESC
        LIMIT 5
      `),

      // ==========================================
      // CONVERSION RATE
      // PAID / (PAID + EXPIRED) × 100
      // Order PENDING yang masih aktif tidak dihitung
      // karena belum tentu gagal
      // ==========================================
      query(`
        SELECT
          COUNT(*) FILTER (WHERE status IN ('PAID','PROCESSING','SHIPPED','DELIVERED','DONE','REFUNDED')) AS paid_count,
          COUNT(*) FILTER (WHERE status = 'EXPIRED') AS expired_count,
          CASE
            WHEN COUNT(*) FILTER (WHERE status IN ('PAID','PROCESSING','SHIPPED','DELIVERED','DONE','REFUNDED','EXPIRED')) = 0
            THEN 0
            ELSE ROUND(
              COUNT(*) FILTER (WHERE status IN ('PAID','PROCESSING','SHIPPED','DELIVERED','DONE','REFUNDED'))::NUMERIC
              / COUNT(*) FILTER (WHERE status IN ('PAID','PROCESSING','SHIPPED','DELIVERED','DONE','REFUNDED','EXPIRED'))::NUMERIC
              * 100,
              2
            )
          END AS conversion_rate
        FROM orders
      `),
    ]);

    const overview = overviewResult.rows[0];
    const conversion = conversionResult.rows[0];

    res.json({
      success: true,
      message: "OK",
      data: {
        overview: {
          total_orders: Number(overview.total_orders),
          total_revenue: Number(overview.total_revenue),
          revenue_this_month: Number(overview.revenue_this_month),
          orders_this_month: Number(overview.orders_this_month),
        },
        orders_by_status: ordersByStatusResult.rows.map((r) => ({
          status: r.status,
          count: Number(r.count),
        })),
        revenue_monthly: revenueMonthlyResult.rows.map((r) => ({
          month: r.month,
          month_label: r.month_label,
          total_orders: Number(r.total_orders),
          total_revenue: Number(r.total_revenue),
        })),
        top_products: topProductsResult.rows.map((r) => ({
          id: r.id,
          name: r.name,
          product_type: r.product_type,
          price: Number(r.price),
          image_url: r.image_url,
          total_sold: Number(r.total_sold),
          total_revenue: Number(r.total_revenue),
        })),
        conversion: {
          paid_count: Number(conversion.paid_count),
          expired_count: Number(conversion.expired_count),
          conversion_rate: Number(conversion.conversion_rate),
        },
      },
    });
  } catch (err) {
    console.error("getAnalyticsSummary error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
