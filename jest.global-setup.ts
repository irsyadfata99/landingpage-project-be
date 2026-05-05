import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.test" });

export default async function globalSetup() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  await client.connect();

  // Bersihkan data test sebelum mulai
  await client.query(`
    TRUNCATE orders, order_items, products, vouchers, voucher_uses,
             product_reviews, expeditions, admins
    RESTART IDENTITY CASCADE
  `);

  // Seed admin untuk test
  await client.query(`
    INSERT INTO admins (username, email, password_hash)
    VALUES ('testadmin', 'admin@test.com', '$2b$10$zsFv4UrewCRuLB3j6Vj2wOYUVc8JmlGzO66vkthpdKRFHfKorQZ5e')
  `);

  await client.end();
}
