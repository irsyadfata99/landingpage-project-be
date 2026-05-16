-- ==========================================
-- MIGRATION: Trust Badges + Closing CTA
--
-- Untuk fitur:
--   10. Countdown Timer Promo → tidak ada perubahan DB
--       (promo.end_date sudah ada di tabel promo_section)
--   11. Trust Badges          → tabel baru trust_badges
--   12. Closing CTA Section   → kolom baru di site_config
--
-- Urutan jalankan:
--   Jika setup fresh → cukup jalankan schema.sql (belum ada)
--   Jika sudah existing → jalankan file ini
-- ==========================================


-- ==========================================
-- 11. TRUST BADGES
-- ==========================================
CREATE TABLE IF NOT EXISTS trust_badges (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label       VARCHAR(100) NOT NULL,
  image_url   TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trust_badges_is_active ON trust_badges(is_active);
CREATE INDEX IF NOT EXISTS idx_trust_badges_sort_order ON trust_badges(sort_order);

-- Trigger updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_trust_badges_updated_at'
  ) THEN
    CREATE TRIGGER trg_trust_badges_updated_at
      BEFORE UPDATE ON trust_badges
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- Seed default trust badges (VA bank + SSL)
INSERT INTO trust_badges (label, sort_order, is_active) VALUES
  ('BCA Virtual Account',     1, TRUE),
  ('BNI Virtual Account',     2, TRUE),
  ('BRI Virtual Account',     3, TRUE),
  ('Mandiri Virtual Account', 4, TRUE),
  ('QRIS',                    5, TRUE),
  ('SSL Secured',             6, TRUE),
  ('100% Aman',               7, TRUE)
ON CONFLICT DO NOTHING;


-- ==========================================
-- 12. CLOSING CTA — kolom baru di site_config
-- ==========================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_config' AND column_name = 'closing_cta_headline'
  ) THEN
    ALTER TABLE site_config ADD COLUMN closing_cta_headline VARCHAR(255);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_config' AND column_name = 'closing_cta_subtext'
  ) THEN
    ALTER TABLE site_config ADD COLUMN closing_cta_subtext TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_config' AND column_name = 'closing_cta_text'
  ) THEN
    ALTER TABLE site_config ADD COLUMN closing_cta_text VARCHAR(100);
  END IF;
END $$;