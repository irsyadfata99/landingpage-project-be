-- ==========================================
-- SCHEMA.SQL
-- Landing Page + Checkout System
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- ADMIN
-- ==========================================
CREATE TABLE admins (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username      VARCHAR(100) NOT NULL UNIQUE,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- SITE CONFIG (satu baris saja)
-- ==========================================
CREATE TABLE site_config (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_name        VARCHAR(255) NOT NULL DEFAULT 'Nama Toko',
  logo_url          TEXT,
  favicon_url       TEXT,
  primary_color     VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
  secondary_color   VARCHAR(7) NOT NULL DEFAULT '#10B981',
  font_family       VARCHAR(100) NOT NULL DEFAULT 'Inter',
  font_url          TEXT NOT NULL DEFAULT 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  meta_title        VARCHAR(255) NOT NULL DEFAULT 'Nama Toko',
  meta_description  TEXT NOT NULL DEFAULT '',
  og_image_url      TEXT,
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- HERO SECTION (satu baris saja)
-- ==========================================
CREATE TABLE hero_section (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  headline      VARCHAR(255) NOT NULL DEFAULT 'Headline Utama',
  subheadline   TEXT,
  cta_text      VARCHAR(100) NOT NULL DEFAULT 'Beli Sekarang',
  image_url     TEXT,
  bg_color      VARCHAR(7) DEFAULT '#FFFFFF',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- PROMO SECTION (satu baris saja)
-- ==========================================
CREATE TABLE promo_section (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  badge_text    VARCHAR(100),
  title         VARCHAR(255) NOT NULL DEFAULT 'Promo Spesial',
  description   TEXT,
  image_url     TEXT,
  start_date    TIMESTAMP WITH TIME ZONE,
  end_date      TIMESTAMP WITH TIME ZONE,
  is_active     BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- PRICING ITEMS (banyak baris)
-- ==========================================
CREATE TABLE pricing_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(255) NOT NULL,
  price           BIGINT NOT NULL DEFAULT 0,
  original_price  BIGINT,
  features        TEXT[] NOT NULL DEFAULT '{}',
  is_popular      BOOLEAN NOT NULL DEFAULT FALSE,
  cta_text        VARCHAR(100) NOT NULL DEFAULT 'Pilih Paket',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- TESTIMONIALS (banyak baris)
-- ==========================================
CREATE TABLE testimonials (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name       VARCHAR(255) NOT NULL,
  customer_photo_url  TEXT,
  content             TEXT NOT NULL,
  rating              SMALLINT NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  testimonial_date    DATE,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- FAQ (banyak baris)
-- ==========================================
CREATE TABLE faqs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- CONTACT PERSON (satu baris saja)
-- ==========================================
CREATE TABLE contact_person (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              VARCHAR(255) NOT NULL DEFAULT 'Admin',
  whatsapp_number   VARCHAR(20),
  email             VARCHAR(255),
  photo_url         TEXT,
  cta_text          VARCHAR(100) NOT NULL DEFAULT 'Chat Sekarang',
  instagram_url     TEXT,
  tiktok_url        TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- EMAIL TEMPLATES
-- Jenis: payment_success | shipping | delivery_confirm
-- ==========================================
CREATE TABLE email_templates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type            VARCHAR(50) NOT NULL UNIQUE
                    CHECK (type IN ('payment_success', 'shipping', 'delivery_confirm')),
  subject         VARCHAR(255) NOT NULL,
  body_html       TEXT NOT NULL,
  available_vars  TEXT[] NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- BANK ACCOUNTS
-- ==========================================
CREATE TABLE bank_accounts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bank_name       VARCHAR(100) NOT NULL,
  account_number  VARCHAR(50) NOT NULL,
  account_name    VARCHAR(255) NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pastikan hanya satu rekening yang aktif
CREATE UNIQUE INDEX idx_bank_accounts_active ON bank_accounts (is_active)
  WHERE is_active = TRUE;

-- ==========================================
-- WITHDRAWAL SETTINGS (satu baris saja)
-- ==========================================
CREATE TABLE withdrawal_settings (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  withdrawal_date       SMALLINT NOT NULL DEFAULT 1
                          CHECK (withdrawal_date BETWEEN 1 AND 28),
  minimum_amount        BIGINT NOT NULL DEFAULT 0,
  is_auto               BOOLEAN NOT NULL DEFAULT FALSE,
  notification_email    VARCHAR(255),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- WITHDRAWAL HISTORY
-- ==========================================
CREATE TABLE withdrawal_history (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bank_account_id   UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE RESTRICT,
  amount            BIGINT NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                      CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
  tripay_ref        VARCHAR(255),
  notes             TEXT,
  requested_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at      TIMESTAMP WITH TIME ZONE,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- EXPEDITIONS
-- ==========================================
CREATE TABLE expeditions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(255) NOT NULL,
  logo_url    TEXT,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- PRODUCTS
-- ==========================================
CREATE TABLE products (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                    VARCHAR(255) NOT NULL,
  description             TEXT,
  price                   BIGINT NOT NULL DEFAULT 0,
  original_price          BIGINT,
  product_type            VARCHAR(10) NOT NULL DEFAULT 'PHYSICAL'
                            CHECK (product_type IN ('PHYSICAL', 'DIGITAL', 'BOTH')),
  stock                   INTEGER,
  image_url               TEXT,
  download_url            TEXT,
  download_expires_hours  INTEGER NOT NULL DEFAULT 24,
  is_active               BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order              INTEGER NOT NULL DEFAULT 0,
  created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- ORDERS
-- Status flow: PENDING → PAID → PROCESSING → SHIPPED → DELIVERED → DONE
-- Tidak ada cancel & tidak ada refund
-- ==========================================
CREATE TABLE orders (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_code            VARCHAR(50) NOT NULL UNIQUE,
  customer_name         VARCHAR(255) NOT NULL,
  customer_email        VARCHAR(255) NOT NULL,
  customer_phone        VARCHAR(20) NOT NULL,
  customer_address      TEXT,
  customer_city         VARCHAR(255),
  customer_province     VARCHAR(255),
  customer_postal_code  VARCHAR(10),
  status                VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                          CHECK (status IN ('PENDING','PAID','PROCESSING','SHIPPED','DELIVERED','DONE')),
  total_amount          BIGINT NOT NULL DEFAULT 0,
  expedition_id         UUID REFERENCES expeditions(id) ON DELETE SET NULL,
  expedition_name       VARCHAR(255),
  tracking_number       VARCHAR(255),
  payment_method        VARCHAR(50),
  payment_bank          VARCHAR(20),
  payment_token         TEXT,
  payment_url           TEXT,
  tripay_order_id       VARCHAR(100),
  no_cancel_ack         BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at               TIMESTAMP WITH TIME ZONE,
  shipped_at            TIMESTAMP WITH TIME ZONE,
  delivered_at          TIMESTAMP WITH TIME ZONE,
  confirmed_at          TIMESTAMP WITH TIME ZONE,
  notes                 TEXT,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- ORDER ITEMS
-- ==========================================
CREATE TABLE order_items (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id              UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id            UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name          VARCHAR(255) NOT NULL,
  product_type          VARCHAR(10) NOT NULL
                          CHECK (product_type IN ('PHYSICAL', 'DIGITAL', 'BOTH')),
  quantity              INTEGER NOT NULL DEFAULT 1,
  price                 BIGINT NOT NULL DEFAULT 0,
  subtotal              BIGINT NOT NULL DEFAULT 0,
  download_url          TEXT,
  download_expires_at   TIMESTAMP WITH TIME ZONE
);

-- ==========================================
-- INDEXES
-- ==========================================
CREATE INDEX idx_orders_status             ON orders(status);
CREATE INDEX idx_orders_customer_email     ON orders(customer_email);
CREATE INDEX idx_orders_order_code         ON orders(order_code);
CREATE INDEX idx_orders_created_at         ON orders(created_at DESC);
CREATE INDEX idx_order_items_order_id      ON order_items(order_id);
CREATE INDEX idx_products_is_active        ON products(is_active);
CREATE INDEX idx_withdrawal_history_status ON withdrawal_history(status);
CREATE INDEX idx_withdrawal_history_requested_at ON withdrawal_history(requested_at DESC);

-- ==========================================
-- TRIGGER: AUTO UPDATE updated_at
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_admins_updated_at
  BEFORE UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_site_config_updated_at
  BEFORE UPDATE ON site_config FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_hero_section_updated_at
  BEFORE UPDATE ON hero_section FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_promo_section_updated_at
  BEFORE UPDATE ON promo_section FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_pricing_items_updated_at
  BEFORE UPDATE ON pricing_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_testimonials_updated_at
  BEFORE UPDATE ON testimonials FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_faqs_updated_at
  BEFORE UPDATE ON faqs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_contact_person_updated_at
  BEFORE UPDATE ON contact_person FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_email_templates_updated_at
  BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_bank_accounts_updated_at
  BEFORE UPDATE ON bank_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_withdrawal_settings_updated_at
  BEFORE UPDATE ON withdrawal_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_withdrawal_history_updated_at
  BEFORE UPDATE ON withdrawal_history FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_expeditions_updated_at
  BEFORE UPDATE ON expeditions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==========================================
-- TRIGGER: ENFORCE ORDER STATUS TRANSITION
-- PENDING → PAID → PROCESSING → SHIPPED → DELIVERED → DONE
-- ==========================================
CREATE OR REPLACE FUNCTION enforce_order_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NOT (
    (OLD.status = 'PENDING'    AND NEW.status = 'PAID')       OR
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

CREATE TRIGGER trg_orders_status_transition
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION enforce_order_status_transition();

-- ==========================================
-- TRIGGER: ENFORCE SINGLE ACTIVE BANK ACCOUNT
-- ==========================================
CREATE OR REPLACE FUNCTION enforce_single_active_bank()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = TRUE THEN
    UPDATE bank_accounts
    SET is_active = FALSE
    WHERE id != NEW.id AND is_active = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bank_accounts_single_active
  BEFORE INSERT OR UPDATE ON bank_accounts
  FOR EACH ROW EXECUTE FUNCTION enforce_single_active_bank();