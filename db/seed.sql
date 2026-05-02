-- ==========================================
-- SEED.SQL
-- Data awal untuk development
-- Jalankan setelah schema.sql
-- ==========================================

-- ==========================================
-- ADMIN (password: admin1234)
-- Ganti password setelah pertama login!
-- ==========================================
INSERT INTO admins (username, email, password_hash) VALUES (
  'admin',
  'admin@example.com',
  '$2b$10$zsFv4UrewCRuLB3j6Vj2wOYUVc8JmlGzO66vkthpdKRFHfKorQZ5e'
);

-- ==========================================
-- SITE CONFIG
-- ==========================================
INSERT INTO site_config (
  brand_name, primary_color, secondary_color,
  font_family, font_url,
  meta_title, meta_description
) VALUES (
  'Nama Toko Anda',
  '#3B82F6',
  '#10B981',
  'Inter',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
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
  99000, 149000,
  ARRAY['Fitur A', 'Fitur B', 'Support Email'],
  FALSE, 'Pilih Paket', 1
),
(
  'Paket Pro',
  199000, 299000,
  ARRAY['Semua Fitur Starter', 'Fitur C', 'Fitur D', 'Support Prioritas'],
  TRUE, 'Pilih Paket', 2
),
(
  'Paket Enterprise',
  499000, NULL,
  ARRAY['Semua Fitur Pro', 'Fitur E', 'Dedicated Support', 'Custom Integrasi'],
  FALSE, 'Hubungi Kami', 3
);

-- ==========================================
-- TESTIMONIALS
-- ==========================================
INSERT INTO testimonials (customer_name, content, rating, testimonial_date, is_active, sort_order) VALUES
('Budi Santoso', 'Produk sangat bagus dan pengiriman cepat. Sangat puas!',       5, '2025-01-10', TRUE, 1),
('Siti Rahayu',  'Kualitas melebihi ekspektasi. Harga terjangkau, recommended!', 5, '2025-01-15', TRUE, 2),
('Ahmad Fauzi',  'Pelayanan ramah dan produk original. Sudah beli 3 kali.',      4, '2025-01-20', TRUE, 3);

-- ==========================================
-- FAQ
-- ==========================================
INSERT INTO faqs (question, answer, is_active, sort_order) VALUES
(
  'Berapa lama proses pengiriman?',
  'Proses pengiriman 1-3 hari kerja tergantung lokasi tujuan dan ekspedisi yang dipilih.',
  TRUE, 1
),
(
  'Apakah bisa melakukan pengembalian produk?',
  'Mohon maaf, semua transaksi bersifat final. Tidak ada pembatalan atau pengembalian dana (refund).',
  TRUE, 2
),
(
  'Metode pembayaran apa yang tersedia?',
  'Kami menerima pembayaran melalui Virtual Account (BCA, BNI, BRI, Mandiri) dan QRIS.',
  TRUE, 3
),
(
  'Bagaimana cara melacak pesanan saya?',
  'Setelah pembayaran berhasil, Anda akan menerima email dengan Order ID dan link tracking.',
  TRUE, 4
),
(
  'Apakah pesanan bisa dibatalkan?',
  'Tidak. Setiap pembelian bersifat final dan tidak dapat dibatalkan. Pastikan Anda sudah memilih produk yang tepat sebelum melakukan pembayaran.',
  TRUE, 5
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
-- EMAIL TEMPLATES
-- ==========================================
INSERT INTO email_templates (type, subject, body_html, available_vars) VALUES
(
  'payment_success',
  '✅ Pembayaran Berhasil - {{order_code}}',
  '<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:30px 0;">
  <table width="600" align="center" style="background:#fff;border-radius:8px;overflow:hidden;">
    <tr><td style="background:#3B82F6;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;">Nama Toko Anda</h1>
    </td></tr>
    <tr><td style="padding:32px;">
      <h2 style="color:#166534;">✅ Pembayaran Berhasil!</h2>
      <p>Halo <strong>{{customer_name}}</strong>, terima kasih! Pesanan Anda telah kami terima.</p>
      <table width="100%" cellpadding="6" style="background:#f8f8f8;border-radius:6px;">
        <tr><td style="color:#666;font-size:13px;">No. Order</td><td style="font-weight:bold;">{{order_code}}</td></tr>
        <tr><td style="color:#666;font-size:13px;">Total</td><td style="font-weight:bold;">{{total_amount}}</td></tr>
        <tr><td style="color:#666;font-size:13px;">Pembayaran</td><td>{{payment_method}}</td></tr>
      </table>
      <h3 style="font-size:14px;margin-top:16px;">Detail Pesanan</h3>
      {{items}}
      {{download_links}}
      <div style="margin-top:24px;text-align:center;">
        <a href="#" style="display:block;background:#3B82F6;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">
          Lacak Pesanan
        </a>
      </div>
    </td></tr>
    <tr><td style="background:#f8f8f8;padding:16px 32px;text-align:center;border-top:1px solid #eee;">
      <p style="color:#999;font-size:12px;margin:0;">Email ini dikirim otomatis. Jangan balas email ini.</p>
    </td></tr>
  </table>
</body>
</html>',
  ARRAY['{{customer_name}}','{{order_code}}','{{total_amount}}','{{payment_method}}','{{items}}','{{download_links}}']
),
(
  'shipping',
  '🚚 Pesanan Dikirim - {{order_code}} (Resi: {{tracking_number}})',
  '<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:30px 0;">
  <table width="600" align="center" style="background:#fff;border-radius:8px;overflow:hidden;">
    <tr><td style="background:#3B82F6;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;">Nama Toko Anda</h1>
    </td></tr>
    <tr><td style="padding:32px;">
      <h2 style="color:#1d4ed8;">🚚 Pesanan Sedang Dikirim!</h2>
      <p>Halo <strong>{{customer_name}}</strong>, pesanan Anda sedang dalam perjalanan.</p>
      <table width="100%" cellpadding="6" style="background:#eff6ff;border:1px solid #93c5fd;border-radius:6px;">
        <tr><td style="color:#666;font-size:13px;">No. Order</td><td style="font-weight:bold;">{{order_code}}</td></tr>
        <tr><td style="color:#666;font-size:13px;">Ekspedisi</td><td style="font-weight:bold;">{{expedition_name}}</td></tr>
        <tr><td style="color:#666;font-size:13px;">No. Resi</td><td style="font-weight:bold;color:#1d4ed8;font-size:15px;">{{tracking_number}}</td></tr>
      </table>
      <h3 style="font-size:14px;margin-top:16px;">Alamat Pengiriman</h3>
      <div style="background:#f8f8f8;border-radius:6px;padding:12px;font-size:13px;color:#555;">
        {{shipping_address}}
      </div>
      <div style="margin-top:24px;text-align:center;">
        <a href="#" style="display:block;background:#3B82F6;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;margin-bottom:12px;">
          Lacak Pesanan
        </a>
        <a href="{{confirm_url}}" style="display:block;background:#10B981;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">
          ✅ Konfirmasi Pesanan Diterima
        </a>
      </div>
    </td></tr>
    <tr><td style="background:#f8f8f8;padding:16px 32px;text-align:center;border-top:1px solid #eee;">
      <p style="color:#999;font-size:12px;margin:0;">Email ini dikirim otomatis. Jangan balas email ini.</p>
    </td></tr>
  </table>
</body>
</html>',
  ARRAY['{{customer_name}}','{{order_code}}','{{expedition_name}}','{{tracking_number}}','{{shipping_address}}','{{confirm_url}}']
),
(
  'delivery_confirm',
  '🎉 Pesanan Selesai - {{order_code}}',
  '<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:30px 0;">
  <table width="600" align="center" style="background:#fff;border-radius:8px;overflow:hidden;">
    <tr><td style="background:#3B82F6;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;">Nama Toko Anda</h1>
    </td></tr>
    <tr><td style="padding:32px;">
      <h2 style="color:#166534;">🎉 Pesanan Telah Diterima!</h2>
      <p>Terima kasih <strong>{{customer_name}}</strong> telah berbelanja. Senang bisa melayani Anda!</p>
      <table width="100%" cellpadding="6" style="background:#f0fdf4;border:1px solid #86efac;border-radius:6px;">
        <tr><td style="color:#666;font-size:13px;">No. Order</td><td style="font-weight:bold;">{{order_code}}</td></tr>
        <tr><td style="color:#666;font-size:13px;">Status</td><td style="color:#166534;font-weight:bold;">SELESAI ✓</td></tr>
        <tr><td style="color:#666;font-size:13px;">Dikonfirmasi</td><td>{{confirmed_at}}</td></tr>
      </table>
      <p style="color:#555;font-size:14px;margin-top:16px;">
        Jika Anda puas, ceritakan pengalaman Anda kepada orang-orang terdekat. Kami sangat menghargai kepercayaan Anda! 😊
      </p>
    </td></tr>
    <tr><td style="background:#f8f8f8;padding:16px 32px;text-align:center;border-top:1px solid #eee;">
      <p style="color:#999;font-size:12px;margin:0;">Email ini dikirim otomatis. Jangan balas email ini.</p>
    </td></tr>
  </table>
</body>
</html>',
  ARRAY['{{customer_name}}','{{order_code}}','{{confirmed_at}}']
);

-- ==========================================
-- WITHDRAWAL SETTINGS (default)
-- ==========================================
INSERT INTO withdrawal_settings (withdrawal_date, minimum_amount, is_auto) VALUES (
  1,
  0,
  FALSE
);

-- ==========================================
-- EXPEDITIONS
-- ==========================================
INSERT INTO expeditions (name, description, is_active, sort_order) VALUES
('JNE',           'Jalur Nugraha Ekakurir', TRUE, 1),
('J&T Express',   'J&T Express Indonesia',  TRUE, 2),
('SiCepat',       'SiCepat Ekspres',        TRUE, 3),
('AnterAja',      'AnterAja Ekspres',        TRUE, 4),
('Pos Indonesia', 'PT Pos Indonesia',        TRUE, 5);

-- ==========================================
-- SAMPLE PRODUCTS
-- ==========================================
INSERT INTO products (name, description, price, original_price, product_type, stock, is_active, sort_order) VALUES
(
  'Produk Fisik Contoh',
  'Deskripsi produk fisik ini. Terbuat dari bahan berkualitas tinggi.',
  150000, 200000, 'PHYSICAL', 50, TRUE, 1
),
(
  'Produk Digital Contoh',
  'E-book atau template digital berkualitas. Download langsung setelah pembayaran.',
  75000, NULL, 'DIGITAL', NULL, TRUE, 2
);