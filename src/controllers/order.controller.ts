import { Request, Response } from "express";
import { query, transaction } from "../config/db";
import {
  CreateOrderBody,
  OrderFilter,
  UpdateTrackingBody,
} from "../types/order.types";
import { ApiResponse, PaginatedResponse } from "../types/response.types";
import {
  sendShippingEmail,
  sendDeliveryConfirmEmail,
} from "../services/email.service";

// ==========================================
// HELPER: generate order code
// ==========================================
const generateOrderCode = (): string => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${dateStr}-${rand}`;
};

// ==========================================
// POST /api/orders (public — checkout)
// ==========================================
export const createOrder = async (
  req: Request<object, object, CreateOrderBody>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const {
      customer_name,
      customer_email,
      customer_phone,
      customer_address,
      customer_city,
      customer_province,
      customer_postal_code,
      expedition_id,
      payment_method,
      bank,
      items,
      notes,
    } = req.body;

    // Validasi field wajib
    if (
      !customer_name ||
      !customer_email ||
      !customer_phone ||
      !payment_method ||
      !items?.length
    ) {
      res
        .status(400)
        .json({
          success: false,
          message: "Data customer dan items wajib diisi",
        });
      return;
    }

    if (payment_method === "bank_transfer" && !bank) {
      res
        .status(400)
        .json({ success: false, message: "Bank wajib dipilih untuk transfer" });
      return;
    }

    const order = await transaction(async (client) => {
      // 1. Ambil data produk dan validasi stok
      const productIds = items.map((i) => i.product_id);
      const productsResult = await client.query(
        `SELECT * FROM products WHERE id = ANY($1::uuid[]) AND is_active = TRUE`,
        [productIds],
      );

      if (productsResult.rows.length !== items.length) {
        throw new Error("Beberapa produk tidak ditemukan atau tidak aktif");
      }

      // 2. Hitung total dan validasi stok
      let totalAmount = 0;
      const orderItems = items.map((item) => {
        const product = productsResult.rows.find(
          (p) => p.id === item.product_id,
        );
        if (!product)
          throw new Error(`Produk ${item.product_id} tidak ditemukan`);

        // Cek stok untuk produk fisik
        if (product.stock !== null && product.stock < item.quantity) {
          throw new Error(`Stok produk "${product.name}" tidak mencukupi`);
        }

        const subtotal = product.price * item.quantity;
        totalAmount += subtotal;

        return { product, quantity: item.quantity, subtotal };
      });

      // 3. Validasi ekspedisi jika ada produk fisik
      const hasPhysical = orderItems.some(
        (i) =>
          i.product.product_type === "PHYSICAL" ||
          i.product.product_type === "BOTH",
      );
      if (hasPhysical && !expedition_id) {
        throw new Error("Ekspedisi wajib dipilih untuk produk fisik");
      }

      let expeditionName = null;
      if (expedition_id) {
        const expResult = await client.query(
          "SELECT name FROM expeditions WHERE id = $1 AND is_active = TRUE",
          [expedition_id],
        );
        if (expResult.rowCount === 0)
          throw new Error("Ekspedisi tidak ditemukan");
        expeditionName = expResult.rows[0].name;
      }

      // 4. Buat order
      const orderCode = generateOrderCode();
      const orderResult = await client.query(
        `INSERT INTO orders (
          order_code, customer_name, customer_email, customer_phone,
          customer_address, customer_city, customer_province, customer_postal_code,
          total_amount, expedition_id, expedition_name, payment_method, payment_bank, notes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
        [
          orderCode,
          customer_name,
          customer_email,
          customer_phone,
          customer_address ?? null,
          customer_city ?? null,
          customer_province ?? null,
          customer_postal_code ?? null,
          totalAmount,
          expedition_id ?? null,
          expeditionName,
          payment_method,
          bank ?? null,
          notes ?? null,
        ],
      );

      const newOrder = orderResult.rows[0];

      // 5. Insert order items + kurangi stok
      for (const item of orderItems) {
        const { product, quantity, subtotal } = item;

        // Hitung download_expires_at untuk produk digital
        let downloadExpiresAt = null;
        if (
          product.product_type === "DIGITAL" ||
          product.product_type === "BOTH"
        ) {
          const expDate = new Date();
          expDate.setHours(expDate.getHours() + product.download_expires_hours);
          downloadExpiresAt = expDate.toISOString();
        }

        await client.query(
          `INSERT INTO order_items (
            order_id, product_id, product_name, product_type,
            quantity, price, subtotal, download_url, download_expires_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            newOrder.id,
            product.id,
            product.name,
            product.product_type,
            quantity,
            product.price,
            subtotal,
            product.download_url ?? null,
            downloadExpiresAt,
          ],
        );

        // Kurangi stok jika bukan unlimited
        if (product.stock !== null) {
          await client.query(
            "UPDATE products SET stock = stock - $1 WHERE id = $2",
            [quantity, product.id],
          );
        }
      }

      return newOrder;
    });

    res.status(201).json({
      success: true,
      message: "Order berhasil dibuat",
      data: { order_id: order.id, order_code: order.order_code },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    console.error("createOrder error:", err);
    res.status(400).json({ success: false, message });
  }
};

// ==========================================
// GET /api/orders/track/:orderCode (public)
// ==========================================
export const trackOrder = async (
  req: Request<{ orderCode: string }>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const orderResult = await query(
      `SELECT id, order_code, customer_name, status, total_amount,
              expedition_name, tracking_number, payment_method,
              payment_bank, paid_at, shipped_at, delivered_at, confirmed_at, created_at
       FROM orders WHERE order_code = $1`,
      [req.params.orderCode],
    );

    if (orderResult.rowCount === 0) {
      res
        .status(404)
        .json({ success: false, message: "Order tidak ditemukan" });
      return;
    }

    const order = orderResult.rows[0];
    const itemsResult = await query(
      `SELECT product_name, product_type, quantity, price, subtotal FROM order_items WHERE order_id = $1`,
      [order.id],
    );

    res.json({
      success: true,
      message: "OK",
      data: { ...order, items: itemsResult.rows },
    });
  } catch (err) {
    console.error("trackOrder error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// GET /api/admin/orders (admin)
// ==========================================
export const getAllOrders = async (
  req: Request<object, object, object, OrderFilter>,
  res: Response<PaginatedResponse<object>>,
): Promise<void> => {
  try {
    const { status, search, start_date, end_date } = req.query;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (status) {
      conditions.push(`status = $${idx++}`);
      params.push(status);
    }
    if (search) {
      conditions.push(
        `(order_code ILIKE $${idx} OR customer_name ILIKE $${idx} OR customer_email ILIKE $${idx})`,
      );
      params.push(`%${search}%`);
      idx++;
    }
    if (start_date) {
      conditions.push(`created_at >= $${idx++}`);
      params.push(start_date);
    }
    if (end_date) {
      conditions.push(`created_at <= $${idx++}`);
      params.push(end_date);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await query(
      `SELECT COUNT(*) FROM orders ${where}`,
      params,
    );
    const total = Number(countResult.rows[0].count);

    const dataResult = await query(
      `SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      [...params, limit, offset],
    );

    res.json({
      success: true,
      message: "OK",
      data: dataResult.rows,
      pagination: { total, page, limit, total_pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("getAllOrders error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      data: [],
      pagination: { total: 0, page: 1, limit: 20, total_pages: 0 },
    });
  }
};

// ==========================================
// GET /api/admin/orders/:id (admin)
// ==========================================
export const getOrderById = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const orderResult = await query("SELECT * FROM orders WHERE id = $1", [
      req.params.id,
    ]);
    if (orderResult.rowCount === 0) {
      res
        .status(404)
        .json({ success: false, message: "Order tidak ditemukan" });
      return;
    }

    const itemsResult = await query(
      "SELECT * FROM order_items WHERE order_id = $1",
      [req.params.id],
    );

    res.json({
      success: true,
      message: "OK",
      data: { ...orderResult.rows[0], items: itemsResult.rows },
    });
  } catch (err) {
    console.error("getOrderById error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// PATCH /api/admin/orders/:id/status (admin)
// ==========================================
export const updateOrderStatus = async (
  req: Request<{ id: string }, object, { status: string }>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const validStatuses = [
      "PENDING",
      "PAID",
      "PROCESSING",
      "SHIPPED",
      "DELIVERED",
      "DONE",
    ];
    const { status } = req.body;

    if (!validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: "Status tidak valid" });
      return;
    }

    const result = await query(
      `UPDATE orders SET status = $1 WHERE id = $2 RETURNING *`,
      [status, req.params.id],
    );

    if (result.rowCount === 0) {
      res
        .status(404)
        .json({ success: false, message: "Order tidak ditemukan" });
      return;
    }

    res.json({
      success: true,
      message: `Status order diubah ke ${status}`,
      data: result.rows[0],
    });
  } catch (err) {
    console.error("updateOrderStatus error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// PATCH /api/admin/orders/:id/tracking (admin)
// Input resi — trigger email ke customer
// ==========================================
export const updateTracking = async (
  req: Request<{ id: string }, object, UpdateTrackingBody>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const { tracking_number, expedition_name } = req.body;

    if (!tracking_number) {
      res
        .status(400)
        .json({ success: false, message: "Nomor resi wajib diisi" });
      return;
    }

    const result = await query(
      `UPDATE orders SET
        tracking_number = $1,
        expedition_name = COALESCE($2, expedition_name),
        status = 'SHIPPED',
        shipped_at = NOW()
       WHERE id = $3 RETURNING *`,
      [tracking_number, expedition_name ?? null, req.params.id],
    );

    if (result.rowCount === 0) {
      res
        .status(404)
        .json({ success: false, message: "Order tidak ditemukan" });
      return;
    }

    // Kirim email notifikasi pengiriman (non-blocking)
    const updatedOrder = result.rows[0];
    const itemsResult = await query(
      "SELECT * FROM order_items WHERE order_id = $1",
      [updatedOrder.id],
    );
    sendShippingEmail({ ...updatedOrder, items: itemsResult.rows }).catch(
      (err) => console.error("Gagal kirim email pengiriman:", err),
    );

    res.json({
      success: true,
      message: "Nomor resi berhasil diinput",
      data: updatedOrder,
    });
  } catch (err) {
    console.error("updateTracking error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// PATCH /api/orders/:orderCode/confirm (public)
// Customer konfirmasi pesanan diterima
// ==========================================
export const confirmDelivery = async (
  req: Request<{ orderCode: string }>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const result = await query(
      `UPDATE orders SET
        status = 'DONE',
        confirmed_at = NOW()
       WHERE order_code = $1 AND status = 'DELIVERED'
       RETURNING *`,
      [req.params.orderCode],
    );

    if (result.rowCount === 0) {
      res.status(400).json({
        success: false,
        message: "Order tidak ditemukan atau belum berstatus DELIVERED",
      });
      return;
    }

    // Kirim email konfirmasi diterima (non-blocking)
    const confirmedOrder = result.rows[0];
    const itemsResult = await query(
      "SELECT * FROM order_items WHERE order_id = $1",
      [confirmedOrder.id],
    );
    sendDeliveryConfirmEmail({
      ...confirmedOrder,
      items: itemsResult.rows,
    }).catch((err) => console.error("Gagal kirim email konfirmasi:", err));

    res.json({
      success: true,
      message: "Pesanan berhasil dikonfirmasi",
      data: confirmedOrder,
    });
  } catch (err) {
    console.error("confirmDelivery error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// GET /api/admin/orders/export (admin)
// Export orders ke Excel
// ==========================================
export const exportOrders = async (
  req: Request<object, object, object, OrderFilter>,
  res: Response,
): Promise<void> => {
  try {
    const { exportOrdersToExcel } = await import("../services/export.service");
    const buffer = await exportOrdersToExcel(req.query);

    const filename = `orders-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(Buffer.from(buffer as ArrayBuffer));
  } catch (err) {
    console.error("exportOrders error:", err);
    res.status(500).json({ success: false, message: "Gagal export data" });
  }
};
