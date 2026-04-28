-- ==========================================
-- SEED.SQL
-- Data awal untuk development
-- Jalankan setelah schema.sql
-- ==========================================

-- ==========================================
-- ADMIN (password: admin123)
-- Ganti password setelah pertama login!
-- Hash dibuat dengan bcryptjs rounds=10
-- ==========================================
INSERT INTO admins (username, email, password_hash) VALUES (
  'admin',
  'admin@example.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
);

-- ==========================================
-- SITE CONFIG
-- ==========================================
INSERT INTO site_config (
  brand_name, primary_color, secondary_color,
  meta_title, meta_description
) VALUES (
  'Nama Toko Anda',
  '#3B82F6',
  '#10B981',
  'Nama Toko Anda - Produk Terbaik',
  'Deskripsi singkat toko dan produk Anda di sini.'
);

-- ==========================================
-- HERO SECTION
-- ==========================================
INSERT INTO hero_section (headline, subheadline, cta_text, is_active) VALUES (
  'Solusi Terbaik untuk Kebutuhan Anda',
  'Dapatkan produk berkualitas tinggi dengan harga terjangkau. Ribuan pelanggan sudah puas!',
  'Beli Sekarang',
  TRUE
);

-- ==========================================
-- PROMO SECTION
-- ==========================================
INSERT INTO promo_section (badge_text, title, description, is_active) VALUES (
  'Promo Terbatas',
  'Diskon Spesial Hari Ini',
  'Jangan lewatkan penawaran terbaik kami. Stok terbatas!',
  FALSE
);

-- ==========================================
-- PRICING ITEMS
-- ==========================================
INSERT INTO pricing_items (name, price, original_price, features, is_popular, cta_text, sort_order) VALUES
(
  'Paket Starter',
  99000,
  149000,
  ARRAY['Fitur A', 'Fitur B', 'Support Email'],
  FALSE,
  'Pilih Paket',
  1
),
(
  'Paket Pro',
  199000,
  299000,
  ARRAY['Semua Fitur Starter', 'Fitur C', 'Fitur D', 'Support Prioritas'],
  TRUE,
  'Pilih Paket',
  2
),
(
  'Paket Enterprise',
  499000,
  NULL,
  ARRAY['Semua Fitur Pro', 'Fitur E', 'Dedicated Support', 'Custom Integrasi'],
  FALSE,
  'Hubungi Kami',
  3
);

-- ==========================================
-- TESTIMONIALS
-- ==========================================
INSERT INTO testimonials (customer_name, content, rating, testimonial_date, is_active, sort_order) VALUES
(
  'Budi Santoso',
  'Produk sangat bagus dan pengiriman cepat. Sangat puas dengan pembelian ini!',
  5,
  '2025-01-10',
  TRUE,
  1
),
(
  'Siti Rahayu',
  'Kualitas melebihi ekspektasi. Harga terjangkau, recommended banget!',
  5,
  '2025-01-15',
  TRUE,
  2
),
(
  'Ahmad Fauzi',
  'Pelayanan ramah dan produk original. Sudah beli 3 kali, selalu puas.',
  4,
  '2025-01-20',
  TRUE,
  3
);

-- ==========================================
-- FAQ
-- ==========================================
INSERT INTO faqs (question, answer, is_active, sort_order) VALUES
(
  'Berapa lama proses pengiriman?',
  'Proses pengiriman 1-3 hari kerja tergantung lokasi tujuan dan ekspedisi yang dipilih.',
  TRUE,
  1
),
(
  'Apakah bisa melakukan pengembalian produk?',
  'Ya, produk dapat dikembalikan dalam 7 hari jika terdapat kerusakan atau tidak sesuai pesanan.',
  TRUE,
  2
),
(
  'Metode pembayaran apa yang tersedia?',
  'Kami menerima pembayaran melalui Virtual Account (BCA, BNI, BRI, Mandiri, Permata) dan QRIS.',
  TRUE,
  3
),
(
  'Bagaimana cara melacak pesanan saya?',
  'Setelah pembayaran berhasil, Anda akan menerima email dengan Order ID dan link tracking untuk memantau status pesanan.',
  TRUE,
  4
);

-- ==========================================
-- CONTACT PERSON
-- ==========================================
INSERT INTO contact_person (name, whatsapp_number, email, cta_text, is_active) VALUES (
  'Admin Toko',
  '6281234567890',
  'admin@example.com',
  'Chat Sekarang',
  TRUE
);

-- ==========================================
-- EXPEDITIONS
-- ==========================================
INSERT INTO expeditions (name, description, is_active, sort_order) VALUES
('JNE', 'Jalur Nugraha Ekakurir', TRUE, 1),
('J&T Express', 'J&T Express Indonesia', TRUE, 2),
('SiCepat', 'SiCepat Ekspres', TRUE, 3),
('AnterAja', 'AnterAja Ekspres', TRUE, 4),
('Pos Indonesia', 'PT Pos Indonesia', TRUE, 5);

-- ==========================================
-- SAMPLE PRODUCTS
-- ==========================================
INSERT INTO products (name, description, price, original_price, product_type, stock, is_active, sort_order) VALUES
(
  'Produk Fisik Contoh',
  'Deskripsi produk fisik ini. Terbuat dari bahan berkualitas tinggi.',
  150000,
  200000,
  'PHYSICAL',
  50,
  TRUE,
  1
),
(
  'Produk Digital Contoh',
  'E-book atau template digital berkualitas. Download langsung setelah pembayaran.',
  75000,
  NULL,
  'DIGITAL',
  NULL,
  TRUE,
  2
);