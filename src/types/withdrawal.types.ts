// ==========================================
// WITHDRAWAL TYPES
// (Bank Account & Penarikan Dana Tripay)
// ==========================================

// --- BANK ACCOUNT ---

export interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateBankAccountBody {
  bank_name: string;
  account_number: string;
  account_name: string;
  is_active?: boolean;
}

export interface UpdateBankAccountBody extends Partial<CreateBankAccountBody> {}

// --- WITHDRAWAL SETTINGS ---

export interface WithdrawalSettings {
  id: string;
  withdrawal_date: number;
  minimum_amount: number;
  is_auto: boolean;
  notification_email: string | null;
  updated_at: Date;
}

export interface UpdateWithdrawalSettingsBody {
  withdrawal_date?: number;
  minimum_amount?: number;
  is_auto?: boolean;
  notification_email?: string;
}

// --- WITHDRAWAL HISTORY ---

export type WithdrawalStatus = "PENDING" | "SUCCESS" | "FAILED";

export interface WithdrawalHistory {
  id: string;
  bank_account_id: string;
  amount: number;
  status: WithdrawalStatus;
  tripay_ref: string | null; // FIX #2: midtrans_ref → tripay_ref
  notes: string | null;
  requested_at: Date;
  processed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface WithdrawalHistoryWithBank extends WithdrawalHistory {
  bank_name: string;
  account_number: string;
  account_name: string;
}

export interface CreateWithdrawalBody {
  amount: number;
  bank_account_id: string;
  notes?: string;
}

export interface UpdateWithdrawalStatusBody {
  status: WithdrawalStatus;
  tripay_ref?: string; // FIX #2: midtrans_ref → tripay_ref
  notes?: string;
}

export interface WithdrawalFilter {
  status?: WithdrawalStatus;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}
