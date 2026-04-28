import { Pool, PoolConfig } from "pg";
import dotenv from "dotenv";

dotenv.config();

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // maksimal koneksi dalam pool
  idleTimeoutMillis: 30000, // tutup koneksi idle setelah 30 detik
  connectionTimeoutMillis: 2000, // timeout jika gagal konek dalam 2 detik
};

const pool = new Pool(poolConfig);

// Test koneksi saat pertama kali dijalankan
pool.on("connect", () => {
  if (process.env.NODE_ENV === "development") {
    console.log("✅ PostgreSQL connected");
  }
});

pool.on("error", (err) => {
  console.error("❌ PostgreSQL pool error:", err.message);
  process.exit(1);
});

// Helper: query dengan otomatis release client
export const query = async (text: string, params?: unknown[]) => {
  const start = Date.now();
  const result = await pool.query(text, params);

  if (process.env.NODE_ENV === "development") {
    const duration = Date.now() - start;
    console.log(
      `🔍 Query executed in ${duration}ms | rows: ${result.rowCount}`,
    );
  }

  return result;
};

// Helper: transaksi (BEGIN → COMMIT / ROLLBACK)
export const transaction = async <T>(
  callback: (client: Awaited<ReturnType<typeof pool.connect>>) => Promise<T>,
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export default pool;
