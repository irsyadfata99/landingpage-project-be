-- ==========================================
-- MIGRATION: Add vouchers, product_reviews
-- Alter orders: tambah discount_amount, voucher_code
-- Alter orders: tambah status EXPIRED dan REFUNDED
--
-- File ini hanya dibutuhkan jika Anda upgrade dari
-- schema lama (sebelum voucher & review).
-- Jika setup fresh, cukup jalankan schema.sql saja.
--
-- Urutan jalankan:
--   1. schema.sql  (setup fresh)
--   ATAU
--   1. schema lama
--   2. file ini (migration untuk yang sudah existing)
-- ==========================================

-- ==========================================
-- 1. UPDATE CONSTRAINT STATUS ORDERS
--    Tambah EXPIRED dan REFUNDED
-- ==========================================
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'PENDING','PAID','PROCESSING','SHIPPED',
    'DELIVERED','DONE','EXPIRED','REFUNDED'
  ));

-- ==========================================
-- 2. ALTER ORDERS
--    Tambah kolom discount_amount dan voucher_code
--    Gunakan IF NOT EXISTS guard via DO block
-- ==========================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'discount_amount'
  ) THEN
    ALTER TABLE orders ADD COLUMN discount_amount BIGINT NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'voucher_code'
  ) THEN
    ALTER TABLE orders ADD COLUMN voucher_code VARCHAR(50);
  END IF;
END $$;

-- ==========================================
-- 3. VOUCHERS
-- ==========================================
CREATE TABLE IF NOT EXISTS vouchers (
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

CREATE INDEX IF NOT EXISTS idx_vouchers_code      ON vouchers(code);
CREATE INDEX IF NOT EXISTS idx_vouchers_is_active ON vouchers(is_active);

-- ==========================================
-- 4. VOUCHER USES
--    Mencatat siapa saja yang sudah pakai voucher
--    Kombinasi voucher_id + customer_email harus unik
-- ==========================================
CREATE TABLE IF NOT EXISTS voucher_uses (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  voucher_id     UUID NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  order_id       UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_email VARCHAR(255) NOT NULL,
  used_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_voucher_uses_unique
  ON voucher_uses(voucher_id, customer_email);
CREATE INDEX IF NOT EXISTS idx_voucher_uses_voucher_id ON voucher_uses(voucher_id);

-- ==========================================
-- 5. PRODUCT REVIEWS
--    Hanya customer dengan order DONE yang bisa review
--    is_approved = FALSE → perlu moderasi admin
-- ==========================================
CREATE TABLE IF NOT EXISTS product_reviews (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id     UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id       UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_name  VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  rating         SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment        TEXT,
  is_approved    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Satu customer hanya bisa review satu produk per order
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_reviews_unique
  ON product_reviews(product_id, order_id, customer_email);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id
  ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_is_approved
  ON product_reviews(is_approved);

-- ==========================================
-- 6. TRIGGERS updated_at untuk tabel baru
-- ==========================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_vouchers_updated_at'
  ) THEN
    CREATE TRIGGER trg_vouchers_updated_at
      BEFORE UPDATE ON vouchers
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_product_reviews_updated_at'
  ) THEN
    CREATE TRIGGER trg_product_reviews_updated_at
      BEFORE UPDATE ON product_reviews
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- ==========================================
-- 7. UPDATE TRIGGER enforce_order_status_transition
--    Tambah transisi EXPIRED dan REFUNDED
-- ==========================================
CREATE OR REPLACE FUNCTION enforce_order_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NOT (
    (OLD.status = 'PENDING'    AND NEW.status = 'PAID')       OR
    (OLD.status = 'PENDING'    AND NEW.status = 'EXPIRED')    OR
    (OLD.status = 'PAID'       AND NEW.status = 'PROCESSING') OR
    (OLD.status = 'PAID'       AND NEW.status = 'REFUNDED')   OR
    (OLD.status = 'PROCESSING' AND NEW.status = 'SHIPPED')    OR
    (OLD.status = 'PROCESSING' AND NEW.status = 'REFUNDED')   OR
    (OLD.status = 'SHIPPED'    AND NEW.status = 'DELIVERED')  OR
    (OLD.status = 'DELIVERED'  AND NEW.status = 'DONE')
  ) THEN
    RAISE EXCEPTION 'Transisi status tidak valid: % → %', OLD.status, NEW.status;
  END IF;

  IF NEW.status = 'PAID' THEN
    NEW.paid_at = COALESCE(NEW.paid_at, NOW());
  ELSIF NEW.status = 'SHIPPED' THEN
    NEW.shipped_at = COALESCE(NEW.shipped_at, NOW());
  ELSIF NEW.status = 'DELIVERED' THEN
    NEW.delivered_at = COALESCE(NEW.delivered_at, NOW());
  ELSIF NEW.status = 'DONE' THEN
    NEW.confirmed_at = COALESCE(NEW.confirmed_at, NOW());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;