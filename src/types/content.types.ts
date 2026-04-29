// ==========================================
// CONTENT TYPES (Landing Page Sections)
// ==========================================

// --- SITE CONFIG ---
export interface SiteConfig {
  id: string;
  brand_name: string;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  font_family: string; // nama font Google Fonts, contoh: 'Inter'
  font_url: string; // URL embed Google Fonts
  meta_title: string;
  meta_description: string;
  og_image_url: string | null;
  updated_at: Date;
}

export interface UpdateSiteConfigBody {
  brand_name?: string;
  primary_color?: string;
  secondary_color?: string;
  font_family?: string;
  font_url?: string;
  meta_title?: string;
  meta_description?: string;
}

// --- HERO ---
export interface HeroSection {
  id: string;
  headline: string;
  subheadline: string | null;
  cta_text: string;
  image_url: string | null;
  bg_color: string | null;
  is_active: boolean;
  updated_at: Date;
}

export interface UpdateHeroBody {
  headline?: string;
  subheadline?: string;
  cta_text?: string;
  bg_color?: string;
  is_active?: boolean;
}

// --- PROMO ---
export interface PromoSection {
  id: string;
  badge_text: string | null;
  title: string;
  description: string | null;
  image_url: string | null;
  start_date: Date | null;
  end_date: Date | null;
  is_active: boolean;
  updated_at: Date;
}

export interface UpdatePromoBody {
  badge_text?: string;
  title?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
}

// --- PRICING ---
export interface PricingItem {
  id: string;
  name: string;
  price: number;
  original_price: number | null;
  features: string[];
  is_popular: boolean;
  cta_text: string;
  is_active: boolean;
  sort_order: number;
  updated_at: Date;
}

export interface CreatePricingBody {
  name: string;
  price: number;
  original_price?: number;
  features: string[];
  is_popular?: boolean;
  cta_text?: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface UpdatePricingBody extends Partial<CreatePricingBody> {}

// --- TESTIMONIAL ---
export interface Testimonial {
  id: string;
  customer_name: string;
  customer_photo_url: string | null;
  content: string;
  rating: number; // 1 - 5
  testimonial_date: Date | null;
  is_active: boolean;
  sort_order: number;
  updated_at: Date;
}

export interface CreateTestimonialBody {
  customer_name: string;
  content: string;
  rating: number;
  testimonial_date?: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface UpdateTestimonialBody extends Partial<CreateTestimonialBody> {}

// --- FAQ ---
export interface FAQ {
  id: string;
  question: string;
  answer: string;
  is_active: boolean;
  sort_order: number;
  updated_at: Date;
}

export interface CreateFAQBody {
  question: string;
  answer: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface UpdateFAQBody extends Partial<CreateFAQBody> {}

// --- CONTACT PERSON ---
export interface ContactPerson {
  id: string;
  name: string;
  whatsapp_number: string | null;
  email: string | null;
  photo_url: string | null;
  cta_text: string;
  instagram_url: string | null;
  tiktok_url: string | null;
  is_active: boolean;
  updated_at: Date;
}

export interface UpdateContactPersonBody {
  name?: string;
  whatsapp_number?: string;
  email?: string;
  cta_text?: string;
  instagram_url?: string;
  tiktok_url?: string;
  is_active?: boolean;
}

// --- EXPEDITION ---
export interface Expedition {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateExpeditionBody {
  name: string;
  description?: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface UpdateExpeditionBody extends Partial<CreateExpeditionBody> {}

// --- LANDING PAGE (semua section sekaligus untuk public API) ---
export interface LandingPageData {
  site_config: SiteConfig | null;
  hero: HeroSection | null;
  promo: PromoSection | null;
  pricing: PricingItem[];
  testimonials: Testimonial[];
  faqs: FAQ[];
  contact_person: ContactPerson | null;
}
