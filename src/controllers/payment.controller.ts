import { Request, Response } from "express";
import { query } from "../config/db";
import {
  TRIPAY_API_KEY,
  TRIPAY_BASE_URL,
  TRIPAY_CHANNELS,
  generateSignature,
  verifyWebhookSignature,
} from "../config/tripay";
import { ApiResponse } from "../types/response.types";
import { sendPaymentSuccessEmail } from "../services/email.service";

// ==========================================
// HELPER: HTTP request ke Tripay API
// ==========================================
const tripayRequest = async (
  endpoint: string,
  method: "GET" | "POST",
  body?: object,
): Promise<unknown> => {
  const url = `${TRIPAY_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${TRIPAY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = (await response.json()) as {
    success: boolean;
    message?: string;
    data: unknown;
  };

  if (!data.success) {
    throw new Error(data.message ?? "Tripay API error");
  }

  return data.data;
};

// ==========================================
// POST /api/payment/charge (public)
// ==========================================
export const chargePayment = async (
  req: Request<object, object, { order_id: string }>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const { order_id } = req.body;

    if (!order_id) {
      res.status(400).json({ success: false, message: "order_id wajib diisi" });
      return;
    }

    const orderResult = await query(
      `SELECT o.*, json_agg(
        json_build_object(
          'id', oi.product_id,
          'name', oi.product_name,
          'price', oi.price,
          'quantity', oi.quantity
        )
      ) AS items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.id = $1
       GROUP BY o.id`,
      [order_id],
    );

    if (orderResult.rowCount === 0) {
      res
        .status(404)
        .json({ success: false, message: "Order tidak ditemukan" });
      return;
    }

    const order = orderResult.rows[0];

    if (order.status !== "PENDING") {
      res.status(400).json({
        success: false,
        message: "Order sudah diproses sebelumnya",
      });
      return;
    }

    let channelCode: string;
    if (order.payment_method === "qris") {
      channelCode = TRIPAY_CHANNELS.qris;
    } else if (order.payment_method === "bank_transfer" && order.payment_bank) {
      const bank = order.payment_bank as keyof typeof TRIPAY_CHANNELS;
      if (!TRIPAY_CHANNELS[bank]) {
        res.status(400).json({
          success: false,
          message: `Bank ${order.payment_bank} tidak didukung`,
        });
        return;
      }
      channelCode = TRIPAY_CHANNELS[bank];
    } else {
      res.status(400).json({
        success: false,
        message: "Metode pembayaran tidak valid",
      });
      return;
    }

    const merchantRef = order.order_code;
    const amount = order.total_amount;
    const signature = generateSignature(merchantRef, amount);

    const orderItems = order.items as {
      id: string;
      name: string;
      price: number;
      quantity: number;
    }[];

    const itemDetails = orderItems.map((item) => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    }));

    const payload = {
      method: channelCode,
      merchant_ref: merchantRef,
      amount,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_phone: order.customer_phone,
      order_items: itemDetails,
      signature,
      expired_time: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
      return_url: `${process.env.FRONTEND_URL}/orders/track/${order.order_code}`,
    };

    const tripayData = (await tripayRequest(
      "/transaction/create",
      "POST",
      payload,
    )) as {
      reference: string;
      pay_code?: string;
      pay_url?: string;
      qr_url?: string;
      qr_string?: string;
      amount: number;
      expired_time: number;
    };

    let paymentUrl = "";
    if (order.payment_method === "qris") {
      paymentUrl = tripayData.qr_url ?? tripayData.pay_url ?? "";
    } else {
      paymentUrl = tripayData.pay_code ?? "";
    }

    // FIX #1: gunakan tripay_order_id
    await query(
      `UPDATE orders SET
        tripay_order_id = $1,
        payment_token = $2,
        payment_url = $3
       WHERE id = $4`,
      [tripayData.reference, JSON.stringify(tripayData), paymentUrl, order.id],
    );

    if (order.payment_method === "qris") {
      res.json({
        success: true,
        message: "QRIS berhasil dibuat",
        data: {
          order_code: order.order_code,
          payment_method: "qris",
          qr_url: tripayData.qr_url ?? null,
          qr_string: tripayData.qr_string ?? null,
          total_amount: amount,
          tripay_reference: tripayData.reference,
          expired_time: tripayData.expired_time,
        },
      });
    } else {
      res.json({
        success: true,
        message: "Virtual Account berhasil dibuat",
        data: {
          order_code: order.order_code,
          payment_method: "bank_transfer",
          bank: order.payment_bank,
          channel_code: channelCode,
          va_number: tripayData.pay_code ?? null,
          total_amount: amount,
          tripay_reference: tripayData.reference,
          expired_time: tripayData.expired_time,
        },
      });
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    console.error("chargePayment error:", err);
    res.status(500).json({
      success: false,
      message: `Gagal membuat transaksi pembayaran: ${message}`,
    });
  }
};

// ==========================================
// POST /api/payment/webhook (Tripay callback)
// ==========================================
export const handleWebhook = async (
  req: Request,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body.toString()
      : typeof req.body === "string"
        ? req.body
        : JSON.stringify(req.body);

    const receivedSignature = req.headers["x-callback-signature"] as string;

    if (!receivedSignature) {
      res
        .status(400)
        .json({ success: false, message: "Signature tidak ditemukan" });
      return;
    }

    if (!verifyWebhookSignature(rawBody, receivedSignature)) {
      res
        .status(401)
        .json({ success: false, message: "Signature tidak valid" });
      return;
    }

    const notification = JSON.parse(rawBody);
    const { reference, merchant_ref, status } = notification;

    const orderResult = await query(
      "SELECT * FROM orders WHERE order_code = $1",
      [merchant_ref],
    );

    if (orderResult.rowCount === 0) {
      res
        .status(404)
        .json({ success: false, message: "Order tidak ditemukan" });
      return;
    }

    const order = orderResult.rows[0];

    if (status === "PAID" && order.status === "PENDING") {
      await query(`UPDATE orders SET status = 'PAID' WHERE id = $1`, [
        order.id,
      ]);

      const updatedOrder = await query("SELECT * FROM orders WHERE id = $1", [
        order.id,
      ]);
      const itemsResult = await query(
        "SELECT * FROM order_items WHERE order_id = $1",
        [order.id],
      );
      sendPaymentSuccessEmail({
        ...updatedOrder.rows[0],
        items: itemsResult.rows,
      }).catch((err) =>
        console.error("Gagal kirim email payment success:", err),
      );

      console.log(
        `✅ Order ${merchant_ref} PAID via Tripay (ref: ${reference})`,
      );
    } else if (["EXPIRED", "FAILED"].includes(status)) {
      console.warn(
        `⚠️  Tripay transaction ${status} untuk order ${merchant_ref}`,
      );
    }

    res.json({ success: true, message: "Webhook diproses" });
  } catch (err) {
    console.error("handleWebhook error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// GET /api/payment/status/:orderId (public)
// ==========================================
export const checkPaymentStatus = async (
  req: Request<{ orderId: string }>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    // FIX #1: gunakan tripay_order_id
    const orderResult = await query(
      `SELECT id, order_code, status, payment_method, payment_bank,
        payment_url, total_amount, paid_at, tripay_order_id
        FROM orders WHERE id::text = $1 OR order_code = $1`,
      [req.params.orderId],
    );

    if (orderResult.rowCount === 0) {
      res
        .status(404)
        .json({ success: false, message: "Order tidak ditemukan" });
      return;
    }

    const order = orderResult.rows[0];

    if (order.status === "PENDING" && order.tripay_order_id) {
      try {
        const tripayData = (await tripayRequest(
          `/transaction/detail?reference=${order.tripay_order_id}`,
          "GET",
        )) as { status: string };

        if (tripayData.status === "PAID") {
          await query(`UPDATE orders SET status = 'PAID' WHERE id = $1`, [
            order.id,
          ]);
          order.status = "PAID";
        }
      } catch {
        console.warn("Gagal cek status ke Tripay, gunakan status DB");
      }
    }

    res.json({ success: true, message: "OK", data: order });
  } catch (err) {
    console.error("checkPaymentStatus error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
