-- ==========================================
-- MIGRATION: Pain Points Section
-- Tabel untuk menampilkan masalah pelanggan
-- dan solusi yang ditawarkan
-- ==========================================

CREATE TABLE IF NOT EXISTS pain_points (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  headline    VARCHAR(255) NOT NULL,
  items       TEXT[] NOT NULL DEFAULT '{}',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pain_points_is_active ON pain_points(is_active);
CREATE INDEX IF NOT EXISTS idx_pain_points_sort_order ON pain_points(sort_order);

-- Trigger updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_pain_points_updated_at'
  ) THEN
    CREATE TRIGGER trg_pain_points_updated_at
      BEFORE UPDATE ON pain_points
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- Seed contoh data
INSERT INTO pain_points (headline, items, is_active, sort_order) VALUES
(
  'Masalah yang Sering Dihadapi',
  ARRAY[
    'Bingung mencari produk yang tepat untuk kebutuhan Anda?',
    'Khawatir kualitas produk tidak sesuai ekspektasi?',
    'Takut proses pembayaran rumit dan tidak aman?',
    'Tidak yakin pengiriman akan sampai tepat waktu?'
  ],
  TRUE,
  1
),
(
  'Solusi yang Kami Tawarkan',
  ARRAY[
    'Produk dikurasi khusus dengan standar kualitas ketat',
    'Garansi keaslian produk 100% atau uang kembali',
    'Pembayaran aman via Virtual Account & QRIS terverifikasi',
    'Pengiriman cepat dengan ekspedisi terpercaya & tracking real-time'
  ],
  TRUE,
  2
);