import { Router } from "express";
import {
  chargePayment,
  handleWebhook,
  checkPaymentStatus,
} from "../controllers/payment.controller";
import { chargeRateLimit } from "../config/rate-limit";
import { validate } from "../middlewares/validate.middleware";
import { chargePaymentSchema } from "../validators/payment.validator";

const router = Router();

// ==========================================
// PUBLIC
// ==========================================

// POST /api/payment/charge — rate limit + validasi Zod
router.post(
  "/charge",
  chargeRateLimit,
  validate(chargePaymentSchema),
  chargePayment,
);

// POST /api/payment/webhook — callback dari Tripay (raw body di app.ts)
// Tidak pakai validate middleware — body harus raw untuk verifikasi signature
router.post("/webhook", handleWebhook);

// GET /api/payment/status/:orderId — cek status pembayaran
router.get("/status/:orderId", checkPaymentStatus);

export default router;
