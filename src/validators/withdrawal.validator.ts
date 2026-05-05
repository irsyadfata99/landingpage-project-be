import { z } from "zod";

// ==========================================
// BANK ACCOUNT
// ==========================================
export const createBankAccountSchema = z.object({
  bank_name: z.string().min(1, "Nama bank wajib diisi").max(100),
  account_number: z
    .string()
    .min(5, "Nomor rekening minimal 5 karakter")
    .max(50)
    .regex(/^[0-9]+$/, "Nomor rekening hanya boleh angka"),
  account_name: z.string().min(2, "Nama pemilik rekening wajib diisi").max(255),
  is_active: z.boolean().optional(),
});

export const updateBankAccountSchema = createBankAccountSchema.partial();

// ==========================================
// WITHDRAWAL SETTINGS
// ==========================================
export const updateWithdrawalSettingsSchema = z.object({
  withdrawal_date: z
    .number("Tanggal penarikan harus berupa angka")
    .int()
    .min(1, "Minimal tanggal 1")
    .max(28, "Maksimal tanggal 28")
    .optional(),
  minimum_amount: z
    .number("Minimum amount harus berupa angka")
    .min(0)
    .optional(),
  is_auto: z.boolean().optional(),
  notification_email: z.string().email("Format email tidak valid").optional(),
});

// ==========================================
// WITHDRAWAL REQUEST
// ==========================================
export const createWithdrawalSchema = z.object({
  amount: z
    .number("Jumlah penarikan harus berupa angka")
    .min(1, "Jumlah penarikan harus lebih dari 0"),
  bank_account_id: z
    .string()
    .min(1, "bank_account_id wajib diisi")
    .uuid("bank_account_id harus berupa UUID yang valid"),
  notes: z.string().max(500).optional(),
});

// ==========================================
// WITHDRAWAL STATUS
// ==========================================
export const updateWithdrawalStatusSchema = z.object({
  status: z.enum(["SUCCESS", "FAILED"], {
    error: "Status hanya bisa SUCCESS atau FAILED",
  }),
  tripay_ref: z.string().max(255).optional(),
  notes: z.string().max(500).optional(),
});
