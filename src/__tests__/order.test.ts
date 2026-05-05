import request from "supertest";
import app from "../app";
import { query } from "../config/db";

let productId: string;
let expeditionId: string;

beforeAll(async () => {
  const product = await query(`
    INSERT INTO products (name, price, product_type, stock, is_active)
    VALUES ('Produk Test', 100000, 'PHYSICAL', 10, TRUE)
    RETURNING id
  `);
  productId = product.rows[0].id;

  const expedition = await query(`
    INSERT INTO expeditions (name, is_active)
    VALUES ('JNE Test', TRUE)
    RETURNING id
  `);
  expeditionId = expedition.rows[0].id;
});

afterEach(async () => {
  await query(`
    TRUNCATE orders, order_items, voucher_uses RESTART IDENTITY CASCADE
  `);
  await query(`UPDATE products SET stock = 10 WHERE id = $1`, [productId]);
});

// ==========================================
// TEST: CREATE ORDER
// ==========================================
describe("POST /api/orders", () => {
  const validPayload = () => ({
    customer_name: "Budi Santoso",
    customer_email: "budi@test.com",
    customer_phone: "081234567890",
    customer_address: "Jl. Test No. 1",
    customer_city: "Jakarta",
    customer_province: "DKI Jakarta",
    customer_postal_code: "12345",
    payment_method: "bank_transfer",
    bank: "bca",
    no_cancel_ack: true,
    items: [{ product_id: productId, quantity: 2 }],
    expedition_id: expeditionId,
  });

  it("berhasil membuat order", async () => {
    const res = await request(app).post("/api/orders").send(validPayload());

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("order_code");
    expect(res.body.data.total_amount).toBe(200000);
  });

  it("stok berkurang setelah order dibuat", async () => {
    await request(app).post("/api/orders").send(validPayload());

    const product = await query("SELECT stock FROM products WHERE id = $1", [
      productId,
    ]);
    expect(product.rows[0].stock).toBe(8);
  });

  it("gagal jika no_cancel_ack false", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send({ ...validPayload(), no_cancel_ack: false });

    expect(res.status).toBe(400);
  });

  it("gagal jika stok tidak cukup", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send({
        ...validPayload(),
        items: [{ product_id: productId, quantity: 99 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Stok");
  });

  it("gagal jika bank tidak dipilih saat bank_transfer", async () => {
    const { bank: _bank, ...payload } = validPayload();
    const res = await request(app).post("/api/orders").send(payload);

    expect(res.status).toBe(400);
  });
});

// ==========================================
// TEST: TRACK ORDER
// ==========================================
describe("GET /api/orders/track/:orderCode", () => {
  it("berhasil track order yang ada", async () => {
    const createRes = await request(app)
      .post("/api/orders")
      .send({
        customer_name: "Budi",
        customer_email: "budi@test.com",
        customer_phone: "081234567890",
        payment_method: "bank_transfer",
        bank: "bca",
        no_cancel_ack: true,
        items: [{ product_id: productId, quantity: 1 }],
        expedition_id: expeditionId,
      });

    const orderCode = createRes.body.data.order_code;
    const res = await request(app).get(`/api/orders/track/${orderCode}`);

    expect(res.status).toBe(200);
    expect(res.body.data.order_code).toBe(orderCode);
    expect(res.body.data.items).toHaveLength(1);
  });

  it("404 jika order tidak ditemukan", async () => {
    const res = await request(app).get("/api/orders/track/ORD-NOTEXIST");
    expect(res.status).toBe(404);
  });
});

// ==========================================
// TEST: VOUCHER
// ==========================================
describe("POST /api/orders dengan voucher", () => {
  let voucherId: string;

  beforeEach(async () => {
    const voucher = await query(`
      INSERT INTO vouchers (code, type, value, minimum_order, max_uses, expired_at, is_active)
      VALUES ('TESTDISKON', 'PERCENT', 10, 0, 1, NOW() + INTERVAL '1 day', TRUE)
      RETURNING id
    `);
    voucherId = voucher.rows[0].id;
  });

  afterEach(async () => {
    await query("DELETE FROM vouchers WHERE id = $1", [voucherId]);
  });

  it("berhasil apply voucher diskon 10%", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send({
        customer_name: "Budi",
        customer_email: "budi@test.com",
        customer_phone: "081234567890",
        payment_method: "bank_transfer",
        bank: "bca",
        no_cancel_ack: true,
        items: [{ product_id: productId, quantity: 1 }],
        expedition_id: expeditionId,
        voucher_code: "TESTDISKON",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.discount_amount).toBe(10000);
    expect(res.body.data.total_amount).toBe(90000);
  });

  it("gagal pakai voucher yang sama dua kali oleh customer yang sama", async () => {
    const payload = {
      customer_name: "Budi",
      customer_email: "budi@test.com",
      customer_phone: "081234567890",
      payment_method: "bank_transfer",
      bank: "bca",
      no_cancel_ack: true,
      items: [{ product_id: productId, quantity: 1 }],
      expedition_id: expeditionId,
      voucher_code: "TESTDISKON",
    };

    await request(app).post("/api/orders").send(payload);
    await query("UPDATE products SET stock = 10 WHERE id = $1", [productId]);

    const res = await request(app).post("/api/orders").send(payload);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("sudah pernah menggunakan");
  });
});
