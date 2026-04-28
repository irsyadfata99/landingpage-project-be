// ==========================================
// ORDER TYPES
// ==========================================

export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "DONE";

export type ProductType = "PHYSICAL" | "DIGITAL" | "BOTH";

export interface Order {
  id: string;
  order_code: string; // contoh: ORD-20250101-XXXX
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string | null;
  customer_city: string | null;
  customer_province: string | null;
  customer_postal_code: string | null;
  status: OrderStatus;
  total_amount: number;
  expedition_id: string | null;
  expedition_name: string | null;
  tracking_number: string | null;
  payment_method: string | null;
  payment_token: string | null;
  payment_url: string | null;
  paid_at: Date | null;
  shipped_at: Date | null;
  delivered_at: Date | null;
  confirmed_at: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_type: ProductType;
  quantity: number;
  price: number;
  subtotal: number;
  download_url: string | null;
  download_expires_at: Date | null;
}

// Request body saat checkout
export interface CreateOrderBody {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address?: string;
  customer_city?: string;
  customer_province?: string;
  customer_postal_code?: string;
  expedition_id?: string;
  payment_method: "bank_transfer" | "qris";
  bank?: "bca" | "bni" | "bri" | "mandiri" | "permata";
  items: CreateOrderItemBody[];
  notes?: string;
}

export interface CreateOrderItemBody {
  product_id: string;
  quantity: number;
}

// Response order lengkap dengan items
export interface OrderWithItems extends Order {
  items: OrderItem[];
}

// Filter untuk list order di admin
export interface OrderFilter {
  status?: OrderStatus;
  search?: string; // cari by order_code / customer_name / email
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

// Payload untuk update tracking / resi
export interface UpdateTrackingBody {
  tracking_number: string;
  expedition_name?: string;
}
