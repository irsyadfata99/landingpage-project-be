import { Router } from "express";
import {
  chargePayment,
  handleWebhook,
  checkPaymentStatus,
} from "../controllers/payment.controller";
import { chargeRateLimit } from "../app"; // FIX #4

const router = Router();

// ==========================================
// PUBLIC
// ==========================================

// POST /api/payment/charge — FIX #4: rate limit payment charge
router.post("/charge", chargeRateLimit, chargePayment);

// POST /api/payment/webhook — callback dari Tripay (raw body di app.ts)
router.post("/webhook", handleWebhook);

// GET /api/payment/status/:orderId — cek status pembayaran
router.get("/status/:orderId", checkPaymentStatus);

export default router;
