import { Router } from "express";
import {
  createReview,
  getProductReviews,
} from "../controllers/review.controller";
import { validate } from "../middlewares/validate.middleware";
import { createReviewSchema } from "../validators/review.validator";

const router = Router();

// POST /api/reviews — submit review (public)
router.post("/", validate(createReviewSchema), createReview);

// GET /api/reviews/:productId — ambil review publik per produk
router.get("/:productId", getProductReviews);

export default router;
