import { Router } from "express";
import {
  createOrder,
  trackOrder,
  confirmDelivery,
} from "../controllers/order.controller";

const router = Router();

// ==========================================
// PUBLIC
// ==========================================

// POST /api/orders — buat order baru (checkout)
router.post("/", createOrder);

// GET /api/orders/track/:orderCode — tracking order by order code
router.get("/track/:orderCode", trackOrder);

// PATCH /api/orders/:orderCode/confirm — customer konfirmasi pesanan diterima
router.patch("/:orderCode/confirm", confirmDelivery);

export default router;
