import { query } from "../config/db";

// ==========================================
// EXPIRE ORDERS JOB
// Jalankan setiap 15 menit
// Expire semua order PENDING yang dibuat > 24 jam lalu
// ==========================================

const EXPIRE_AFTER_HOURS = 24;
const INTERVAL_MS = 15 * 60 * 1000; // 15 menit

let jobTimer: NodeJS.Timeout | null = null;

// ==========================================
// CORE: jalankan expire sekali
// ==========================================
export const runExpireOrders = async (): Promise<void> => {
  try {
    const result = await query(
      `UPDATE orders
       SET status = 'EXPIRED'
       WHERE status = 'PENDING'
         AND created_at < NOW() - INTERVAL '${EXPIRE_AFTER_HOURS} hours'
       RETURNING order_code`,
    );

    if (result.rowCount && result.rowCount > 0) {
      const codes = result.rows.map((r) => r.order_code).join(", ");
      console.log(
        `⏰ Expire orders job: ${result.rowCount} order di-expire → [${codes}]`,
      );
    }
  } catch (err) {
    console.error("❌ Expire orders job error:", err);
  }
};

// ==========================================
// START: jalankan saat server start, lalu tiap 15 menit
// ==========================================
export const startExpireOrdersJob = (): void => {
  console.log(
    `⏰ Expire orders job dimulai (interval: ${INTERVAL_MS / 60000} menit, expire setelah: ${EXPIRE_AFTER_HOURS} jam)`,
  );

  // Jalankan sekali langsung saat server start
  runExpireOrders();

  // Kemudian tiap 15 menit
  jobTimer = setInterval(runExpireOrders, INTERVAL_MS);
};

// ==========================================
// STOP: untuk graceful shutdown
// ==========================================
export const stopExpireOrdersJob = (): void => {
  if (jobTimer) {
    clearInterval(jobTimer);
    jobTimer = null;
    console.log("⏰ Expire orders job dihentikan");
  }
};
