// ==========================================
// ORDER TYPES
// ==========================================

// Status flow:
//   PENDING → PAID → PROCESSING → SHIPPED → DELIVERED → DONE
//
// PENDING    : order dibuat, menunggu pembayaran
// PAID       : Midtrans webhook konfirmasi pembayaran
// PROCESSING : admin mulai proses/packing
// SHIPPED    : admin input resi → shipped_at di-set
// DELIVERED  : admin konfirmasi barang sampai → delivered_at di-set
// DONE       : customer konfirmasi terima → confirmed_at di-set
//
// Tidak ada cancel & tidak ada refund
export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "DONE";

// Valid transisi status (untuk validasi di controller sebelum hit DB)
export const VALID_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus | null> =
  {
    PENDING: "PAID",
    PAID: "PROCESSING",
    PROCESSING: "SHIPPED",
    SHIPPED: "DELIVERED",
    DELIVERED: "DONE",
    DONE: null, // status final
  };

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
  expedition_name: string | null; // snapshot saat order
  tracking_number: string | null;
  payment_method: "bank_transfer" | "qris" | null;
  payment_bank: string | null;
  payment_token: string | null;
  payment_url: string | null;
  midtrans_order_id: string | null;
  no_cancel_ack: boolean; // customer acknowledge: tidak bisa cancel/refund
  paid_at: Date | null;
  shipped_at: Date | null;
  delivered_at: Date | null; // di-set saat admin update ke DELIVERED
  confirmed_at: Date | null; // di-set saat customer konfirmasi DONE
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null; // null jika produk sudah dihapus
  product_name: string; // snapshot nama produk saat order
  product_type: ProductType;
  quantity: number;
  price: number;
  subtotal: number;
  download_url: string | null;
  download_expires_at: Date | null;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

// --- REQUEST BODIES ---

export interface CreateOrderItemBody {
  product_id: string;
  quantity: number;
}

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
  no_cancel_ack: boolean; // wajib true agar order bisa dibuat
}

export interface UpdateOrderStatusBody {
  status: OrderStatus;
}

export interface UpdateTrackingBody {
  tracking_number: string;
  expedition_name?: string;
}

// --- FILTER / QUERY PARAMS ---

export interface OrderFilter {
  status?: OrderStatus;
  search?: string; // cari by order_code / customer_name / email
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}
