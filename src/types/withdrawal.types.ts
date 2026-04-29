// ==========================================
// WITHDRAWAL TYPES
// (Bank Account & Penarikan Dana Midtrans)
// ==========================================

// --- BANK ACCOUNT ---

export interface BankAccount {
  id: string;
  bank_name: string; // contoh: 'BCA', 'BNI', 'BRI', 'Mandiri', 'Permata'
  account_number: string;
  account_name: string; // nama pemilik rekening
  is_active: boolean; // hanya satu yang aktif (di-enforce DB trigger)
  created_at: Date;
  updated_at: Date;
}

export interface CreateBankAccountBody {
  bank_name: string;
  account_number: string;
  account_name: string;
  is_active?: boolean; // jika true, rekening lain otomatis dinonaktifkan
}

export interface UpdateBankAccountBody extends Partial<CreateBankAccountBody> {}

// --- WITHDRAWAL SETTINGS ---

export interface WithdrawalSettings {
  id: string;
  withdrawal_date: number; // tanggal penarikan setiap bulan (1-28)
  minimum_amount: number; // minimal saldo untuk bisa tarik (dalam rupiah)
  is_auto: boolean; // penarikan otomatis atau manual
  notification_email: string | null; // email notifikasi saat penarikan
  updated_at: Date;
}

export interface UpdateWithdrawalSettingsBody {
  withdrawal_date?: number; // 1 - 28
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
  midtrans_ref: string | null; // referensi dari Midtrans disbursement
  notes: string | null;
  requested_at: Date;
  processed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

// Withdrawal history dengan detail bank account (untuk tampil di admin)
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
  midtrans_ref?: string;
  notes?: string;
}

// Filter untuk list withdrawal history
export interface WithdrawalFilter {
  status?: WithdrawalStatus;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}
