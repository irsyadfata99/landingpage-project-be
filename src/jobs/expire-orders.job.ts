import { query, transaction } from "../config/db";

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
    // 1. Ambil order PENDING yang sudah expired beserta items-nya
    const expiredOrders = await query(
      `SELECT id, order_code FROM orders
       WHERE status = 'PENDING'
         AND created_at < NOW() - ($1 * INTERVAL '1 hour')`,
      [EXPIRE_AFTER_HOURS],
    );

    if (!expiredOrders.rowCount || expiredOrders.rowCount === 0) return;

    for (const order of expiredOrders.rows) {
      await transaction(async (client) => {
        // 2. Update status ke EXPIRED
        await client.query(
          `UPDATE orders SET status = 'EXPIRED' WHERE id = $1`,
          [order.id],
        );

        // 3. Restore stok — hanya untuk produk yang stok-nya tidak null (bukan unlimited)
        await client.query(
          `UPDATE products p
           SET stock = stock + oi.quantity
           FROM order_items oi
           WHERE oi.order_id = $1
             AND oi.product_id = p.id
             AND p.stock IS NOT NULL`,
          [order.id],
        );
      });

      console.log(`⏰ Order ${order.order_code} di-expire, stok di-restore`);
    }

    console.log(
      `⏰ Expire orders job: ${expiredOrders.rowCount} order di-expire`,
    );
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
