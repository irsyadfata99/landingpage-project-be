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
import {
  updateSiteConfigSchema,
  updateHeroSchema,
  updatePromoSchema,
  createPricingSchema,
  updatePricingSchema,
  createTestimonialSchema,
  updateTestimonialSchema,
  createFAQSchema,
  updateFAQSchema,
  updateContactPersonSchema,
} from "../validators/content.validator";
import {
  createExpeditionSchema,
  updateExpeditionSchema,
} from "../validators/expedition.validator";
import {
  createProductSchema,
  updateProductSchema,
} from "../validators/product.validator";
import {
  createBankAccountSchema,
  updateBankAccountSchema,
  updateWithdrawalSettingsSchema,
  createWithdrawalSchema,
  updateWithdrawalStatusSchema,
} from "../validators/withdrawal.validator";
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
import {
  createVoucherSchema,
  updateVoucherSchema,
} from "../validators/voucher.validator";
import {
  getAllReviews,
  approveReview,
  deleteReview,
} from "../controllers/review.controller";

import {
  getAllTrustBadges,
  createTrustBadge,
  updateTrustBadge,
  deleteTrustBadge,
  toggleTrustBadge,
} from "../controllers/trust-badge.controller";

import {
  createTrustBadgeSchema,
  updateTrustBadgeSchema,
} from "../validators/content.validator";

const router = Router();

const uploadFields = multer({ storage: multer.memoryStorage() }).fields([
  { name: "logo", maxCount: 1 },
  { name: "favicon", maxCount: 1 },
  { name: "og_image", maxCount: 1 },
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
router.put(
  "/content/site-config",
  uploadFields,
  validate(updateSiteConfigSchema),
  updateSiteConfig,
);
router.put(
  "/content/hero",
  uploadSingle,
  validate(updateHeroSchema),
  updateHero,
);
router.put(
  "/content/promo",
  uploadSingle,
  validate(updatePromoSchema),
  updatePromo,
);
router.put(
  "/content/contact",
  uploadSingle,
  validate(updateContactPersonSchema),
  updateContactPerson,
);

// Pricing
router.get("/content/pricing", getPricing);
router.post("/content/pricing", validate(createPricingSchema), createPricing);
router.put(
  "/content/pricing/:id",
  validate(updatePricingSchema),
  updatePricing,
);
router.delete("/content/pricing/:id", deletePricing);

// Testimonial
router.get("/content/testimonials", getTestimonials);
router.post(
  "/content/testimonials",
  uploadSingle,
  validate(createTestimonialSchema),
  createTestimonial,
);
router.put(
  "/content/testimonials/:id",
  uploadSingle,
  validate(updateTestimonialSchema),
  updateTestimonial,
);
router.delete("/content/testimonials/:id", deleteTestimonial);

// FAQ
router.get("/content/faqs", getFAQs);
router.post("/content/faqs", validate(createFAQSchema), createFAQ);
router.put("/content/faqs/:id", validate(updateFAQSchema), updateFAQ);
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
router.post(
  "/products",
  uploadSingle,
  validate(createProductSchema),
  createProduct,
);
router.put(
  "/products/:id",
  uploadSingle,
  validate(updateProductSchema),
  updateProduct,
);
router.delete("/products/:id", deleteProduct);
router.patch("/products/:id/toggle", toggleProduct);

// ==========================================
// EXPEDITIONS
// ==========================================
router.get("/expeditions", getAllExpeditions);
router.post(
  "/expeditions",
  uploadSingle,
  validate(createExpeditionSchema),
  createExpedition,
);
router.put(
  "/expeditions/:id",
  uploadSingle,
  validate(updateExpeditionSchema),
  updateExpedition,
);
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
router.post(
  "/bank-accounts",
  validate(createBankAccountSchema),
  createBankAccount,
);
router.put(
  "/bank-accounts/:id",
  validate(updateBankAccountSchema),
  updateBankAccount,
);
router.delete("/bank-accounts/:id", deleteBankAccount);
router.patch("/bank-accounts/:id/activate", activateBankAccount);

// ==========================================
// WITHDRAWAL
// ==========================================
router.get("/withdrawal/settings", getWithdrawalSettings);
router.put(
  "/withdrawal/settings",
  validate(updateWithdrawalSettingsSchema),
  updateWithdrawalSettings,
);
router.get("/withdrawal/history", getWithdrawalHistory);
router.post(
  "/withdrawal/request",
  validate(createWithdrawalSchema),
  requestWithdrawal,
);
router.patch(
  "/withdrawal/:id/status",
  validate(updateWithdrawalStatusSchema),
  updateWithdrawalStatus,
);

// ==========================================
// VOUCHERS
// ==========================================
router.get("/vouchers", getAllVouchers);
router.get("/vouchers/:id", getVoucherById);
router.post("/vouchers", validate(createVoucherSchema), createVoucher);
router.put("/vouchers/:id", validate(updateVoucherSchema), updateVoucher);
router.delete("/vouchers/:id", deleteVoucher);
router.patch("/vouchers/:id/toggle", toggleVoucher);

// ==========================================
// REVIEWS
// ==========================================
router.get("/reviews", getAllReviews);
router.patch("/reviews/:id/approve", approveReview);
router.delete("/reviews/:id", deleteReview);

router.get("/trust-badges", getAllTrustBadges);
router.post(
  "/trust-badges",
  uploadSingle,
  validate(createTrustBadgeSchema),
  createTrustBadge,
);
router.put(
  "/trust-badges/:id",
  uploadSingle,
  validate(updateTrustBadgeSchema),
  updateTrustBadge,
);
router.delete("/trust-badges/:id", deleteTrustBadge);
router.patch("/trust-badges/:id/toggle", toggleTrustBadge);

export default router;
