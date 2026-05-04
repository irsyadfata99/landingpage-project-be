import { Router } from "express";
import {
  createOrder,
  trackOrder,
  confirmDelivery,
  downloadFile,
} from "../controllers/order.controller";
import { checkoutRateLimit } from "../app";
import { validate } from "../middlewares/validate.middleware";
import { createOrderSchema } from "../validators/order.validator";

const router = Router();

// ==========================================
// PUBLIC
// ==========================================

// POST /api/orders — rate limit + validasi Zod
router.post("/", checkoutRateLimit, validate(createOrderSchema), createOrder);

// GET /api/orders/track/:orderCode — tracking order by order code
router.get("/track/:orderCode", trackOrder);

// GET /api/orders/download/:token — download produk digital via signed URL
router.get("/download/:token", downloadFile);

// PATCH /api/orders/:orderCode/confirm — customer konfirmasi pesanan diterima
router.patch("/:orderCode/confirm", confirmDelivery);

export default router;
