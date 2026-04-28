import { Request, Response } from "express";
import { query } from "../config/db";
import { coreApi } from "../config/midtrans";
import { ApiResponse } from "../types/response.types";
import {
  BankTransferChargeRequest,
  QrisChargeRequest,
  NotificationBody,
  BankTransferResponse,
  QrisResponse,
} from "midtrans-client";

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
      res
        .status(400)
        .json({ success: false, message: "Order sudah diproses sebelumnya" });
      return;
    }

    const midtransOrderId = `${order.order_code}-${Date.now()}`;

    const customerDetails = {
      first_name: order.customer_name,
      email: order.customer_email,
      phone: order.customer_phone,
    };

    const itemDetails = (
      order.items as {
        id: string;
        name: string;
        price: number;
        quantity: number;
      }[]
    ).map((item) => ({
      id: item.id ?? "ITEM",
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    }));

    const transactionDetails = {
      order_id: midtransOrderId,
      gross_amount: order.total_amount,
    };

    // ==========================================
    // BANK TRANSFER (Virtual Account)
    // ==========================================
    if (order.payment_method === "bank_transfer") {
      const chargeRequest: BankTransferChargeRequest = {
        payment_type: "bank_transfer",
        transaction_details: transactionDetails,
        customer_details: customerDetails,
        item_details: itemDetails,
        bank_transfer: { bank: order.payment_bank },
      };

      const chargeResult = (await coreApi.charge(
        chargeRequest,
      )) as BankTransferResponse;

      let paymentUrl = "";
      if (chargeResult.va_numbers?.length) {
        paymentUrl = chargeResult.va_numbers[0].va_number;
      } else if (chargeResult.bill_key) {
        paymentUrl = `${chargeResult.biller_code} / ${chargeResult.bill_key}`;
      }

      await query(
        `UPDATE orders SET midtrans_order_id = $1, payment_token = $2, payment_url = $3 WHERE id = $4`,
        [midtransOrderId, JSON.stringify(chargeResult), paymentUrl, order.id],
      );

      res.json({
        success: true,
        message: "Tagihan VA berhasil dibuat",
        data: {
          order_code: order.order_code,
          payment_method: "bank_transfer",
          bank: order.payment_bank,
          va_number: paymentUrl,
          total_amount: order.total_amount,
          midtrans_order_id: midtransOrderId,
        },
      });
      return;
    }

    // ==========================================
    // QRIS
    // ==========================================
    if (order.payment_method === "qris") {
      const chargeRequest: QrisChargeRequest = {
        payment_type: "qris",
        transaction_details: transactionDetails,
        customer_details: customerDetails,
        item_details: itemDetails,
        qris: { acquirer: "gopay" },
      };

      const chargeResult = (await coreApi.charge(
        chargeRequest,
      )) as QrisResponse;

      let qrImageUrl = "";
      if (chargeResult.actions?.length) {
        const generateAction = chargeResult.actions.find(
          (a) => a.name === "generate-qr-code",
        );
        qrImageUrl = generateAction?.url ?? "";
      }

      await query(
        `UPDATE orders SET midtrans_order_id = $1, payment_token = $2, payment_url = $3 WHERE id = $4`,
        [midtransOrderId, JSON.stringify(chargeResult), qrImageUrl, order.id],
      );

      res.json({
        success: true,
        message: "QRIS berhasil dibuat",
        data: {
          order_code: order.order_code,
          payment_method: "qris",
          qr_image_url: qrImageUrl,
          qr_string: chargeResult.qr_string ?? null,
          total_amount: order.total_amount,
          midtrans_order_id: midtransOrderId,
        },
      });
      return;
    }

    res
      .status(400)
      .json({ success: false, message: "Metode pembayaran tidak didukung" });
  } catch (err) {
    console.error("chargePayment error:", err);
    res
      .status(500)
      .json({ success: false, message: "Gagal membuat transaksi pembayaran" });
  }
};

// ==========================================
// POST /api/payment/webhook (Midtrans callback)
// ==========================================
export const handleWebhook = async (
  req: Request,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const notification: NotificationBody =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const statusResponse = (await coreApi.transaction.notification(
      notification,
    )) as NotificationBody;
    const { order_id, transaction_status, fraud_status } = statusResponse;

    const orderResult = await query(
      "SELECT * FROM orders WHERE midtrans_order_id = $1",
      [order_id],
    );

    if (orderResult.rowCount === 0) {
      res
        .status(404)
        .json({ success: false, message: "Order tidak ditemukan" });
      return;
    }

    const order = orderResult.rows[0];

    if (
      transaction_status === "capture" ||
      transaction_status === "settlement"
    ) {
      if (fraud_status === "challenge") {
        await query(`UPDATE orders SET status = 'PENDING' WHERE id = $1`, [
          order.id,
        ]);
      } else {
        await query(
          `UPDATE orders SET status = 'PAID', paid_at = NOW() WHERE id = $1`,
          [order.id],
        );
      }
    } else if (["cancel", "deny", "expire"].includes(transaction_status)) {
      await query(`UPDATE orders SET status = 'PENDING' WHERE id = $1`, [
        order.id,
      ]);
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
    const orderResult = await query(
      `SELECT id, order_code, status, payment_method, payment_bank,
              payment_url, total_amount, paid_at
       FROM orders WHERE id = $1 OR order_code = $1`,
      [req.params.orderId],
    );

    if (orderResult.rowCount === 0) {
      res
        .status(404)
        .json({ success: false, message: "Order tidak ditemukan" });
      return;
    }

    res.json({ success: true, message: "OK", data: orderResult.rows[0] });
  } catch (err) {
    console.error("checkPaymentStatus error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
