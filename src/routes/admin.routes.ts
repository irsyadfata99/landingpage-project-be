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
  markAsDelivered,
  exportOrders,
} from "../controllers/order.controller";
import {
  getAllEmailTemplates,
  getEmailTemplateByType,
  updateEmailTemplate,
  getTemplateVars,
} from "../controllers/email-template.controller";
import {
  getAllBankAccounts,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  activateBankAccount,
  getWithdrawalSettings,
  updateWithdrawalSettings,
  getWithdrawalHistory,
  requestWithdrawal,
  updateWithdrawalStatus,
} from "../controllers/withdrawal.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { uploadSingle } from "../middlewares/upload.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  loginSchema,
  changePasswordSchema,
} from "../validators/auth.validator";
import { loginRateLimit } from "../config/rate-limit";
import multer from "multer";
import { getAnalyticsSummary } from "../controllers/analytics.controller";

import {
  getAllVouchers,
  getVoucherById,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  toggleVoucher,
} from "../controllers/voucher.controller";
import { createVoucherSchema } from "../validators/voucher.validator";

import {
  getAllReviews,
  approveReview,
  deleteReview,
} from "../controllers/review.controller";

const router = Router();

// uploadFields untuk site-config (logo + favicon) — pakai memory storage
const uploadFields = multer({ storage: multer.memoryStorage() }).fields([
  { name: "logo", maxCount: 1 },
  { name: "favicon", maxCount: 1 },
]);

// ==========================================
// AUTH (public)
// ==========================================
router.post("/login", loginRateLimit, validate(loginSchema), login);

// ==========================================
// Protected
// ==========================================
router.use(authMiddleware);

// Profile
router.get("/me", getMe);
router.put("/password", validate(changePasswordSchema), changePassword);

router.get("/analytics/summary", getAnalyticsSummary);

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

// Testimonial
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
// EMAIL TEMPLATES
// ==========================================
router.get("/email-templates", getAllEmailTemplates);
router.get("/email-templates/:type", getEmailTemplateByType);
router.put("/email-templates/:type", updateEmailTemplate);
router.get("/email-templates/:type/vars", getTemplateVars);

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
router.get("/orders/export", exportOrders);
router.get("/orders/:id", getOrderById);
router.patch("/orders/:id/status", updateOrderStatus);
router.patch("/orders/:id/tracking", updateTracking);
router.patch("/orders/:id/delivered", markAsDelivered);

// ==========================================
// BANK ACCOUNTS
// ==========================================
router.get("/bank-accounts", getAllBankAccounts);
router.post("/bank-accounts", createBankAccount);
router.put("/bank-accounts/:id", updateBankAccount);
router.delete("/bank-accounts/:id", deleteBankAccount);
router.patch("/bank-accounts/:id/activate", activateBankAccount);

// ==========================================
// WITHDRAWAL
// ==========================================
router.get("/withdrawal/settings", getWithdrawalSettings);
router.put("/withdrawal/settings", updateWithdrawalSettings);
router.get("/withdrawal/history", getWithdrawalHistory);
router.post("/withdrawal/request", requestWithdrawal);
router.patch("/withdrawal/:id/status", updateWithdrawalStatus);

// VOUCHERS
router.get("/vouchers", getAllVouchers);
router.get("/vouchers/:id", getVoucherById);
router.post("/vouchers", validate(createVoucherSchema), createVoucher);
router.put("/vouchers/:id", updateVoucher);
router.delete("/vouchers/:id", deleteVoucher);
router.patch("/vouchers/:id/toggle", toggleVoucher);

router.get("/reviews", getAllReviews);
router.patch("/reviews/:id/approve", approveReview);
router.delete("/reviews/:id", deleteReview);

export default router;
