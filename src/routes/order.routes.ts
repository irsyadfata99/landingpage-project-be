import { Router } from "express";
import {
  createOrder,
  trackOrder,
  confirmDelivery,
  downloadFile,
} from "../controllers/order.controller";
import { validateVoucher } from "../controllers/voucher.controller";
import { checkoutRateLimit } from "../config/rate-limit";
import { validate } from "../middlewares/validate.middleware";
import { createOrderSchema } from "../validators/order.validator";
import { validateVoucherSchema } from "../validators/voucher.validator";

const router = Router();

// POST /api/orders
router.post("/", checkoutRateLimit, validate(createOrderSchema), createOrder);

// GET /api/orders/track/:orderCode
router.get("/track/:orderCode", trackOrder);

// GET /api/orders/download/:token
router.get("/download/:token", downloadFile);

// PATCH /api/orders/:orderCode/confirm
router.patch("/:orderCode/confirm", confirmDelivery);

// POST /api/orders/validate-voucher
router.post(
  "/validate-voucher",
  validate(validateVoucherSchema),
  validateVoucher,
);

export default router;
