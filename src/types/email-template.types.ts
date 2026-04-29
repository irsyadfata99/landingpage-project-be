// ==========================================
// EMAIL TEMPLATE TYPES
// ==========================================

// 3 jenis email yang tersedia
export type EmailTemplateType =
  | "payment_success"
  | "shipping"
  | "delivery_confirm";

// Variabel yang tersedia per jenis email (read-only, untuk panduan admin di UI)
export const EMAIL_TEMPLATE_VARS: Record<EmailTemplateType, string[]> = {
  payment_success: [
    "{{customer_name}}",
    "{{order_code}}",
    "{{total_amount}}",
    "{{payment_method}}",
    "{{items}}",
    "{{download_links}}",
  ],
  shipping: [
    "{{customer_name}}",
    "{{order_code}}",
    "{{expedition_name}}",
    "{{tracking_number}}",
    "{{shipping_address}}",
  ],
  delivery_confirm: ["{{customer_name}}", "{{order_code}}", "{{confirmed_at}}"],
};

export interface EmailTemplate {
  id: string;
  type: EmailTemplateType;
  subject: string;
  body_html: string;
  available_vars: string[]; // daftar variabel tersedia (read-only, dari DB)
  is_active: boolean;
  updated_at: Date;
}

export interface UpdateEmailTemplateBody {
  subject?: string;
  body_html?: string;
  is_active?: boolean;
}

// Data yang di-inject saat render template per jenis email
export interface PaymentSuccessTemplateData {
  customer_name: string;
  order_code: string;
  total_amount: string; // sudah diformat: "Rp 150.000"
  payment_method: string;
  items: string; // sudah di-render sebagai HTML tabel
  download_links: string; // sudah di-render sebagai HTML, kosong jika tidak ada produk digital
}

export interface ShippingTemplateData {
  customer_name: string;
  order_code: string;
  expedition_name: string;
  tracking_number: string;
  shipping_address: string; // sudah di-render sebagai plain text / HTML
}

export interface DeliveryConfirmTemplateData {
  customer_name: string;
  order_code: string;
  confirmed_at: string; // sudah diformat: "1 Januari 2025, 10:30"
}

export type EmailTemplateData =
  | PaymentSuccessTemplateData
  | ShippingTemplateData
  | DeliveryConfirmTemplateData;
