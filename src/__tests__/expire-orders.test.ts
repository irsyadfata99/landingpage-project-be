import { runExpireOrders } from "../jobs/expire-orders.job";
import { query } from "../config/db";

let productId: string;
let expeditionId: string;

beforeAll(async () => {
  const product = await query(`
    INSERT INTO products (name, price, product_type, stock, is_active)
    VALUES ('Produk Expire Test', 50000, 'PHYSICAL', 5, TRUE)
    RETURNING id
  `);
  productId = product.rows[0].id;

  const expedition = await query(`
    INSERT INTO expeditions (name, is_active)
    VALUES ('JNE Expire Test', TRUE)
    RETURNING id
  `);
  expeditionId = expedition.rows[0].id;
});

afterEach(async () => {
  await query(
    "TRUNCATE orders, order_items, voucher_uses RESTART IDENTITY CASCADE",
  );
  await query("UPDATE products SET stock = 5 WHERE id = $1", [productId]);
});

afterAll(async () => {
  await query("DELETE FROM products WHERE id = $1", [productId]);
  await query("DELETE FROM expeditions WHERE id = $1", [expeditionId]);
});

describe("runExpireOrders", () => {
  it("meng-expire order PENDING yang sudah lebih dari 24 jam", async () => {
    await query(
      `
      INSERT INTO orders (
        order_code, customer_name, customer_email, customer_phone,
        total_amount, status, payment_method, no_cancel_ack,
        expedition_id, expedition_name, created_at
      ) VALUES (
        'ORD-EXPIRE-001', 'Test', 'test@test.com', '08123456789',
        50000, 'PENDING', 'bank_transfer', TRUE,
        $1, 'JNE', NOW() - INTERVAL '25 hours'
      )
    `,
      [expeditionId],
    );

    await runExpireOrders();

    const result = await query(
      "SELECT status FROM orders WHERE order_code = 'ORD-EXPIRE-001'",
    );
    expect(result.rows[0].status).toBe("EXPIRED");
  });

  it("restore stok setelah order di-expire", async () => {
    const orderRes = await query(
      `
      INSERT INTO orders (
        order_code, customer_name, customer_email, customer_phone,
        total_amount, status, payment_method, no_cancel_ack,
        expedition_id, expedition_name, created_at
      ) VALUES (
        'ORD-EXPIRE-002', 'Test', 'test@test.com', '08123456789',
        50000, 'PENDING', 'bank_transfer', TRUE,
        $1, 'JNE', NOW() - INTERVAL '25 hours'
      ) RETURNING id
    `,
      [expeditionId],
    );

    const orderId = orderRes.rows[0].id;

    await query(
      `
      INSERT INTO order_items (order_id, product_id, product_name, product_type, quantity, price, subtotal)
      VALUES ($1, $2, 'Produk Expire Test', 'PHYSICAL', 3, 50000, 150000)
    `,
      [orderId, productId],
    );

    await query("UPDATE products SET stock = stock - 3 WHERE id = $1", [
      productId,
    ]);

    const before = await query("SELECT stock FROM products WHERE id = $1", [
      productId,
    ]);
    expect(before.rows[0].stock).toBe(2);

    await runExpireOrders();

    const after = await query("SELECT stock FROM products WHERE id = $1", [
      productId,
    ]);
    expect(after.rows[0].stock).toBe(5);
  });

  it("tidak meng-expire order PENDING yang baru dibuat", async () => {
    await query(
      `
      INSERT INTO orders (
        order_code, customer_name, customer_email, customer_phone,
        total_amount, status, payment_method, no_cancel_ack,
        expedition_id, expedition_name
      ) VALUES (
        'ORD-FRESH-001', 'Test', 'test@test.com', '08123456789',
        50000, 'PENDING', 'bank_transfer', TRUE,
        $1, 'JNE'
      )
    `,
      [expeditionId],
    );

    await runExpireOrders();

    const result = await query(
      "SELECT status FROM orders WHERE order_code = 'ORD-FRESH-001'",
    );
    expect(result.rows[0].status).toBe("PENDING");
  });
});
