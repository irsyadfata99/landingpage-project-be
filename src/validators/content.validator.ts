import { z } from "zod";

// ==========================================
// SITE CONFIG
// ==========================================
export const updateSiteConfigSchema = z.object({
  brand_name: z.string().min(1, "Brand name wajib diisi").max(255).optional(),
  primary_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Format warna tidak valid (contoh: #3B82F6)")
    .optional(),
  secondary_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Format warna tidak valid (contoh: #10B981)")
    .optional(),
  font_family: z.string().max(100).optional(),
  font_url: z.string().url("Format URL font tidak valid").optional(),
  meta_title: z.string().max(255).optional(),
  meta_description: z.string().optional(),
  meta_pixel_id: z.string().max(50).optional(),
  ga4_measurement_id: z.string().max(50).optional(),
  // Closing CTA
  closing_cta_headline: z.string().max(255).optional(),
  closing_cta_subtext: z.string().optional(),
  closing_cta_text: z.string().max(100).optional(),
});

// ==========================================
// HERO
// ==========================================
export const updateHeroSchema = z.object({
  headline: z.string().min(1, "Headline wajib diisi").max(255).optional(),
  subheadline: z.string().optional(),
  cta_text: z.string().max(100).optional(),
  bg_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Format warna tidak valid")
    .optional(),
  is_active: z.boolean().optional(),
  secondary_cta_text: z.string().max(100).optional(),
  secondary_cta_target: z.string().max(255).optional(),
});

// ==========================================
// PROMO
// ==========================================
export const updatePromoSchema = z.object({
  badge_text: z.string().max(100).optional(),
  title: z.string().min(1, "Title wajib diisi").max(255).optional(),
  description: z.string().optional(),
  start_date: z
    .string()
    .datetime({ message: "Format tanggal tidak valid" })
    .optional(),
  end_date: z
    .string()
    .datetime({ message: "Format tanggal tidak valid" })
    .optional(),
  is_active: z.boolean().optional(),
});

// ==========================================
// PRICING
// ==========================================
export const createPricingSchema = z.object({
  name: z.string().min(1, "Nama paket wajib diisi").max(255),
  price: z
    .number("Harga harus berupa angka")
    .min(0, "Harga tidak boleh negatif"),
  original_price: z.number("Harga coret harus berupa angka").min(0).optional(),
  features: z.array(z.string().min(1)).min(1, "Minimal 1 fitur wajib diisi"),
  is_popular: z.boolean().optional(),
  cta_text: z.string().max(100).optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
});

export const updatePricingSchema = createPricingSchema.partial();

// ==========================================
// TESTIMONIAL
// ==========================================
export const createTestimonialSchema = z.object({
  customer_name: z.string().min(2, "Nama minimal 2 karakter").max(255),
  content: z.string().min(5, "Konten minimal 5 karakter"),
  rating: z
    .number("Rating harus berupa angka")
    .int()
    .min(1, "Rating minimal 1")
    .max(5, "Rating maksimal 5"),
  testimonial_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD")
    .optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
});

export const updateTestimonialSchema = createTestimonialSchema.partial();

// ==========================================
// FAQ
// ==========================================
export const createFAQSchema = z.object({
  question: z.string().min(5, "Pertanyaan minimal 5 karakter"),
  answer: z.string().min(5, "Jawaban minimal 5 karakter"),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
});

export const updateFAQSchema = createFAQSchema.partial();

// ==========================================
// CONTACT PERSON
// ==========================================
export const updateContactPersonSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(255).optional(),
  whatsapp_number: z
    .string()
    .regex(
      /^[0-9]{9,15}$/,
      "Nomor WhatsApp tidak valid (hanya angka, 9-15 digit)",
    )
    .optional(),
  email: z.string().email("Format email tidak valid").max(255).optional(),
  cta_text: z.string().max(100).optional(),
  instagram_url: z.string().url("Format URL Instagram tidak valid").optional(),
  tiktok_url: z.string().url("Format URL TikTok tidak valid").optional(),
  is_active: z.boolean().optional(),
});

// ==========================================
// TRUST BADGES
// ==========================================
export const createTrustBadgeSchema = z.object({
  label: z.string().min(1, "Label wajib diisi").max(100),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

export const updateTrustBadgeSchema = createTrustBadgeSchema.partial();
