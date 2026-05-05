import { Client } from "pg";
import pool from "./src/config/db";
import dotenv from "dotenv";

dotenv.config({ path: ".env.test" });

export default async function globalTeardown() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  await client.connect();
  await client.query(`
    TRUNCATE orders, order_items, products, vouchers, voucher_uses,
             product_reviews, expeditions, admins
    RESTART IDENTITY CASCADE
  `);
  await client.end();
  await pool.end();
}
