import { Router } from "express";
import { login, getMe, changePassword } from "../controllers/admin.controller";
import {
  updateSiteConfig,
  updateHero,
  updatePromo,
  getPricing,
  createPricing,
  updatePricing,
  deletePricing,
  getTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  getFAQs,
  createFAQ,
  updateFAQ,
  deleteFAQ,
  updateContactPerson,
  getLandingPage,
} from "../controllers/content.controller";
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProduct,
} from "../controllers/product.controller";
import {
  getAllExpeditions,
  createExpedition,
  updateExpedition,
  deleteExpedition,
  toggleExpedition,
} from "../controllers/expedition.controller";
import {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  updateTracking,
} from "../controllers/order.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { uploadSingle } from "../middlewares/upload.middleware";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

// Upload logo + favicon sekaligus untuk site config
const uploadDir = path.join(process.cwd(), process.env.UPLOAD_DIR || "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`),
});
const uploadFields = multer({ storage }).fields([
  { name: "logo", maxCount: 1 },
  { name: "favicon", maxCount: 1 },
]);

// ==========================================
// AUTH (public)
// ==========================================
router.post("/login", login);

// ==========================================
// Protected — semua route di bawah butuh token
// ==========================================
router.use(authMiddleware);

// Profile
router.get("/me", getMe);
router.put("/password", changePassword);

// ==========================================
// CONTENT — Landing Page
// ==========================================
router.get("/content", getLandingPage);
router.put("/content/site-config", uploadFields, updateSiteConfig);
router.put("/content/hero", uploadSingle, updateHero);
router.put("/content/promo", uploadSingle, updatePromo);
router.put("/content/contact", uploadSingle, updateContactPerson);

// Pricing
router.get("/content/pricing", getPricing);
router.post("/content/pricing", createPricing);
router.put("/content/pricing/:id", updatePricing);
router.delete("/content/pricing/:id", deletePricing);

// Testimoni
router.get("/content/testimonials", getTestimonials);
router.post("/content/testimonials", uploadSingle, createTestimonial);
router.put("/content/testimonials/:id", uploadSingle, updateTestimonial);
router.delete("/content/testimonials/:id", deleteTestimonial);

// FAQ
router.get("/content/faqs", getFAQs);
router.post("/content/faqs", createFAQ);
router.put("/content/faqs/:id", updateFAQ);
router.delete("/content/faqs/:id", deleteFAQ);

// ==========================================
// PRODUCTS
// ==========================================
router.get("/products", getAllProducts);
router.get("/products/:id", getProductById);
router.post("/products", uploadSingle, createProduct);
router.put("/products/:id", uploadSingle, updateProduct);
router.delete("/products/:id", deleteProduct);
router.patch("/products/:id/toggle", toggleProduct);

// ==========================================
// EXPEDITIONS
// ==========================================
router.get("/expeditions", getAllExpeditions);
router.post("/expeditions", uploadSingle, createExpedition);
router.put("/expeditions/:id", uploadSingle, updateExpedition);
router.delete("/expeditions/:id", deleteExpedition);
router.patch("/expeditions/:id/toggle", toggleExpedition);

// ==========================================
// ORDERS
// ==========================================
router.get("/orders", getAllOrders);
router.get("/orders/:id", getOrderById);
router.patch("/orders/:id/status", updateOrderStatus);
router.patch("/orders/:id/tracking", updateTracking);

export default router;
