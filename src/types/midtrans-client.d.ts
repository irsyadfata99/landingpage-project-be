declare module "midtrans-client" {
  interface MidtransConfig {
    isProduction: boolean;
    serverKey: string;
    clientKey: string;
  }

  interface TransactionDetails {
    order_id: string;
    gross_amount: number;
  }

  interface CustomerDetails {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  }

  interface ItemDetail {
    id: string;
    price: number;
    quantity: number;
    name: string;
  }

  // ==========================================
  // BANK TRANSFER (Virtual Account)
  // ==========================================
  interface BCAVaConfig {
    sub_company_code?: string;
    callback_virtual_account_number?: string;
  }

  interface MandiriBillConfig {
    company_code?: string;
    bill_info1?: string;
    bill_info2?: string;
  }

  interface BankTransferDetails {
    bank: "bca" | "bni" | "bri" | "mandiri" | "permata";
    va_number?: string;
    bca?: BCAVaConfig;
    mandiri?: MandiriBillConfig;
    free_text?: {
      inquiry?: { id: string; en: string }[];
      payment?: { id: string; en: string }[];
    };
  }

  // ==========================================
  // QRIS
  // ==========================================
  interface QrisDetails {
    acquirer?: "gopay" | "airpay shopee";
  }

  // ==========================================
  // CHARGE REQUESTS
  // ==========================================
  interface BankTransferChargeRequest {
    payment_type: "bank_transfer";
    transaction_details: TransactionDetails;
    bank_transfer: BankTransferDetails;
    customer_details?: CustomerDetails;
    item_details?: ItemDetail[];
  }

  interface QrisChargeRequest {
    payment_type: "qris";
    transaction_details: TransactionDetails;
    qris?: QrisDetails;
    customer_details?: CustomerDetails;
    item_details?: ItemDetail[];
  }

  type ChargeRequest = BankTransferChargeRequest | QrisChargeRequest;

  // ==========================================
  // RESPONSES
  // ==========================================
  interface VaNumber {
    bank: string;
    va_number: string;
  }

  interface QrisAction {
    name: string;
    method: string;
    url: string;
  }

  interface BankTransferResponse {
    status_code: string;
    status_message: string;
    transaction_id: string;
    order_id: string;
    gross_amount: string;
    payment_type: "bank_transfer";
    transaction_status: string;
    transaction_time: string;
    va_numbers: VaNumber[];
    bill_key?: string; // khusus Mandiri
    biller_code?: string; // khusus Mandiri
    [key: string]: unknown;
  }

  interface QrisResponse {
    status_code: string;
    status_message: string;
    transaction_id: string;
    order_id: string;
    gross_amount: string;
    payment_type: "qris";
    transaction_status: string;
    transaction_time: string;
    acquirer: string;
    actions: QrisAction[]; // berisi URL QR code image
    qr_string?: string;
    [key: string]: unknown;
  }

  type MidtransResponse = BankTransferResponse | QrisResponse;

  // ==========================================
  // NOTIFICATION WEBHOOK
  // ==========================================
  interface NotificationBody {
    transaction_status: string; // 'settlement' | 'pending' | 'deny' | 'expire' | 'cancel'
    fraud_status?: string; // 'accept' | 'challenge' | 'deny'
    order_id: string;
    gross_amount: string;
    payment_type: string;
    transaction_id: string;
    transaction_time: string;
    status_code: string;
    status_message: string;
    va_numbers?: VaNumber[];
    bill_key?: string;
    biller_code?: string;
    qr_string?: string;
    [key: string]: unknown;
  }

  // ==========================================
  // CLASSES
  // ==========================================
  class CoreApi {
    constructor(config: MidtransConfig);
    charge(request: ChargeRequest): Promise<MidtransResponse>;
    transaction: {
      notification(body: NotificationBody): Promise<MidtransResponse>;
      status(orderId: string): Promise<MidtransResponse>;
      cancel(orderId: string): Promise<MidtransResponse>;
      expire(orderId: string): Promise<MidtransResponse>;
    };
  }

  class Snap {
    constructor(config: MidtransConfig);
    createTransaction(
      request: ChargeRequest,
    ): Promise<{ token: string; redirect_url: string }>;
    transaction: {
      notification(body: NotificationBody): Promise<MidtransResponse>;
      status(orderId: string): Promise<MidtransResponse>;
    };
  }

  export {
    CoreApi,
    Snap,
    MidtransConfig,
    ChargeRequest,
    BankTransferChargeRequest,
    QrisChargeRequest,
    MidtransResponse,
    BankTransferResponse,
    QrisResponse,
    NotificationBody,
    VaNumber,
    QrisAction,
    ItemDetail,
    CustomerDetails,
    TransactionDetails,
  };
}
