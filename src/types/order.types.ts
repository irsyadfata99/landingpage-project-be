// ==========================================
// ORDER TYPES
// ==========================================

// Status flow:
//   PENDING → PAID → PROCESSING → SHIPPED → DELIVERED → DONE
//   PENDING → EXPIRED  (otomatis via cron job setelah 24 jam tidak dibayar)
//   PAID    → REFUNDED (via Tripay webhook status REFUND)
//   PROCESSING → REFUNDED (via Tripay webhook status REFUND)
//
// PENDING    : order dibuat, menunggu pembayaran
// PAID       : Tripay webhook konfirmasi pembayaran
// PROCESSING : admin mulai proses/packing
// SHIPPED    : admin input resi → shipped_at di-set
// DELIVERED  : admin konfirmasi barang sampai → delivered_at di-set
// DONE       : customer konfirmasi terima → confirmed_at di-set
// EXPIRED    : tidak dibayar dalam 24 jam → di-set otomatis oleh cron job
// REFUNDED   : Tripay mengirim webhook status REFUND ke merchant
//
// Tidak ada cancel dari sisi customer
export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "DONE"
  | "EXPIRED"
  | "REFUNDED";

// Valid transisi status (untuk validasi di controller sebelum hit DB)
// REFUNDED dikecualikan dari sini karena di-set langsung oleh webhook handler,
// bukan via endpoint PATCH /orders/:id/status
export const VALID_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus | null> =
  {
    PENDING: "PAID",
    PAID: "PROCESSING",
    PROCESSING: "SHIPPED",
    SHIPPED: "DELIVERED",
    DELIVERED: "DONE",
    DONE: null, // status final
    EXPIRED: null, // status final
    REFUNDED: null, // status final
  };

export type ProductType = "PHYSICAL" | "DIGITAL" | "BOTH";

export interface Order {
  id: string;
  order_code: string;
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
  payment_method: "bank_transfer" | "qris" | null;
  payment_bank: string | null;
  payment_token: string | null;
  payment_url: string | null;
  tripay_order_id: string | null;
  no_cancel_ack: boolean;
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
  product_id: string | null;
  product_name: string;
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
  no_cancel_ack: boolean;
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
  search?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}
