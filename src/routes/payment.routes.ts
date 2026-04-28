import { Router } from "express";
import {
  chargePayment,
  handleWebhook,
  checkPaymentStatus,
} from "../controllers/payment.controller";

const router = Router();

// ==========================================
// PUBLIC
// ==========================================

// POST /api/payment/charge — buat transaksi VA / QRIS ke Midtrans
router.post("/charge", chargePayment);

// POST /api/payment/webhook — callback notifikasi dari Midtrans
// Catatan: route ini menerima raw body (dikonfigurasi di app.ts)
router.post("/webhook", handleWebhook);

// GET /api/payment/status/:orderId — cek status pembayaran
router.get("/status/:orderId", checkPaymentStatus);

export default router;
