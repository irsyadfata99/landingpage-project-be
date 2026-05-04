export type VoucherType = "PERCENT" | "NOMINAL";

export interface Voucher {
  id: string;
  code: string;
  type: VoucherType;
  value: number;
  minimum_order: number;
  max_uses: number;
  used_count: number;
  expired_at: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateVoucherBody {
  code: string;
  type: VoucherType;
  value: number;
  minimum_order?: number;
  max_uses?: number;
  expired_at: string;
  is_active?: boolean;
}

export interface UpdateVoucherBody extends Partial<CreateVoucherBody> {}

export interface ValidateVoucherBody {
  code: string;
  total_amount: number;
  customer_email: string;
}

export interface VoucherFilter {
  is_active?: boolean;
  page?: number;
  limit?: number;
}
