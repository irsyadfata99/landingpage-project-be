import { Router } from "express";
import { getPublicProducts } from "../controllers/product.controller";
import { getPublicExpeditions } from "../controllers/expedition.controller";

const router = Router();

// ==========================================
// PUBLIC
// ==========================================

// GET /api/products — ambil semua produk aktif untuk checkout
router.get("/", getPublicProducts);

// GET /api/products/expeditions — ambil ekspedisi aktif untuk pilihan di checkout
router.get("/expeditions", getPublicExpeditions);

export default router;
