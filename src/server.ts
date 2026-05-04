import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import pool from "./config/db";
import {
  startExpireOrdersJob,
  stopExpireOrdersJob,
} from "./jobs/expire-orders.job";

const PORT = Number(process.env.PORT) || 5000;

const startServer = async (): Promise<void> => {
  try {
    // Test koneksi database sebelum server start
    await pool.query("SELECT 1");
    console.log("✅ Database connection verified");

    // Jalankan cron job expire orders
    startExpireOrdersJob();

    app.listen(PORT, () => {
      console.log("==========================================");
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Environment : ${process.env.NODE_ENV}`);
      console.log(`🌐 URL         : ${process.env.BASE_URL}`);
      console.log(`🖥️  Frontend    : ${process.env.FRONTEND_URL}`);
      console.log("==========================================");
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("🛑 SIGTERM received, shutting down gracefully...");
  stopExpireOrdersJob();
  await pool.end();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("🛑 SIGINT received, shutting down gracefully...");
  stopExpireOrdersJob();
  await pool.end();
  process.exit(0);
});

startServer();
