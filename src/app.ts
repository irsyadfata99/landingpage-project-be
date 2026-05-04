import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

dotenv.config();

// Routes
import adminRoutes from "./routes/admin.routes";
import productRoutes from "./routes/product.routes";
import orderRoutes from "./routes/order.routes";
import paymentRoutes from "./routes/payment.routes";
import { getLandingPage } from "./controllers/content.controller";
import reviewRoutes from "./routes/review.routes";

const app: Application = express();

// ==========================================
// CORS
// ==========================================
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ==========================================
// RATE LIMITING
// ==========================================

// Login admin: max 10 request per 15 menit per IP
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Terlalu banyak percobaan login. Coba lagi dalam 15 menit.",
  },
});

// Checkout: max 20 order per jam per IP
export const checkoutRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Terlalu banyak request checkout. Coba lagi dalam 1 jam.",
  },
});

// Payment charge: max 20 request per jam per IP
export const chargeRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Terlalu banyak request pembayaran. Coba lagi dalam 1 jam.",
  },
});

// ==========================================
// BODY PARSER
// Tripay webhook butuh raw body untuk verifikasi signature
// ==========================================
app.use("/api/payment/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api/reviews", reviewRoutes);

// ==========================================
// HEALTH CHECK
// ==========================================
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

// ==========================================
// API ROUTES
// ==========================================
app.use("/api/admin", adminRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payment", paymentRoutes);

// GET /api/content — landing page publik
app.get("/api/content", getLandingPage);

// ==========================================
// 404 HANDLER
// ==========================================
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("❌ Unhandled error:", err.message);
  console.error(err.stack);

  res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

export default app;
