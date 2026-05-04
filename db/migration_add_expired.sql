-- ==========================================
-- MIGRATION: Add EXPIRED status to orders
-- Jalankan setelah schema.sql sudah ada
-- ==========================================

-- 1. Drop constraint lama
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

-- 2. Tambah constraint baru dengan EXPIRED
ALTER TABLE orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('PENDING','PAID','PROCESSING','SHIPPED','DELIVERED','DONE','EXPIRED'));

-- 3. Update trigger enforce_order_status_transition
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
    (OLD.status = 'PROCESSING' AND NEW.status = 'SHIPPED')    OR
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