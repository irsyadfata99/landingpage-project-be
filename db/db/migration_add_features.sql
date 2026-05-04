-- ==========================================
-- MIGRATION: Add vouchers, product_reviews
-- Alter orders: tambah voucher_code, discount_amount
-- Jalankan setelah migration_add_refunded.sql
-- ==========================================

-- ==========================================
-- 1. VOUCHERS
-- ==========================================
CREATE TABLE vouchers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            VARCHAR(50) NOT NULL UNIQUE,
  type            VARCHAR(10) NOT NULL CHECK (type IN ('PERCENT', 'NOMINAL')),
  value           BIGINT NOT NULL,
  minimum_order   BIGINT NOT NULL DEFAULT 0,
  max_uses        INTEGER NOT NULL DEFAULT 1,
  used_count      INTEGER NOT NULL DEFAULT 0,
  expired_at      TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_vouchers_code ON vouchers(code);
CREATE INDEX idx_vouchers_is_active ON vouchers(is_active);

-- ==========================================
-- 2. VOUCHER USES
-- Mencatat siapa saja yang sudah pakai voucher
-- Kombinasi voucher_id + customer_email harus unik
-- ==========================================
CREATE TABLE voucher_uses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  voucher_id    UUID NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_email VARCHAR(255) NOT NULL,
  used_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_voucher_uses_unique
  ON voucher_uses(voucher_id, customer_email);
CREATE INDEX idx_voucher_uses_voucher_id ON voucher_uses(voucher_id);

-- ==========================================
-- 3. ALTER ORDERS
-- Tambah kolom voucher & diskon
-- ==========================================
ALTER TABLE orders
  ADD COLUMN voucher_code     VARCHAR(50),
  ADD COLUMN discount_amount  BIGINT NOT NULL DEFAULT 0;

-- ==========================================
-- 4. PRODUCT REVIEWS
-- ==========================================
CREATE TABLE product_reviews (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT,
  is_approved   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Satu customer hanya bisa review satu produk per order
CREATE UNIQUE INDEX idx_product_reviews_unique
  ON product_reviews(product_id, order_id, customer_email);
CREATE INDEX idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX idx_product_reviews_is_approved ON product_reviews(is_approved);

-- ==========================================
-- 5. TRIGGERS updated_at
-- ==========================================
CREATE TRIGGER trg_vouchers_updated_at
  BEFORE UPDATE ON vouchers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_product_reviews_updated_at
  BEFORE UPDATE ON product_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at();