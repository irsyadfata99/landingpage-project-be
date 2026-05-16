-- ==========================================
-- MIGRATION: UTM Tracking + Meta Pixel + GA4
-- ==========================================

-- ==========================================
-- 1. UTM COLUMNS di tabel orders
-- ==========================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'utm_source'
  ) THEN
    ALTER TABLE orders ADD COLUMN utm_source VARCHAR(100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'utm_medium'
  ) THEN
    ALTER TABLE orders ADD COLUMN utm_medium VARCHAR(100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'utm_campaign'
  ) THEN
    ALTER TABLE orders ADD COLUMN utm_campaign VARCHAR(100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'referrer'
  ) THEN
    ALTER TABLE orders ADD COLUMN referrer TEXT;
  END IF;
END $$;

-- ==========================================
-- 2. META PIXEL ID di tabel site_config
-- ==========================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_config' AND column_name = 'meta_pixel_id'
  ) THEN
    ALTER TABLE site_config ADD COLUMN meta_pixel_id VARCHAR(50);
  END IF;
END $$;

-- ==========================================
-- 3. GA4 MEASUREMENT ID di tabel site_config
-- ==========================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_config' AND column_name = 'ga4_measurement_id'
  ) THEN
    ALTER TABLE site_config ADD COLUMN ga4_measurement_id VARCHAR(50);
  END IF;
END $$;