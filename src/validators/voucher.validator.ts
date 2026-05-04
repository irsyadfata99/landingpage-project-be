import { z } from "zod";

export const createVoucherSchema = z
  .object({
    code: z
      .string()
      .min(3, "Kode voucher minimal 3 karakter")
      .max(50, "Kode voucher maksimal 50 karakter")
      .regex(
        /^[A-Z0-9_-]+$/,
        "Kode voucher hanya boleh huruf kapital, angka, - dan _",
      ),

    type: z.enum(["PERCENT", "NOMINAL"], {
      error: "Tipe voucher harus PERCENT atau NOMINAL",
    }),

    value: z.number("Value harus berupa angka").min(1, "Value minimal 1"),

    minimum_order: z
      .number("Minimum order harus berupa angka")
      .min(0, "Minimum order tidak boleh negatif")
      .optional(),

    max_uses: z
      .number("Max uses harus berupa angka")
      .int("Max uses harus bilangan bulat")
      .min(1, "Max uses minimal 1")
      .optional(),

    expired_at: z.string().min(1, "Tanggal expired wajib diisi"),

    is_active: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.type === "PERCENT" && data.value > 100) return false;
      return true;
    },
    {
      message: "Value untuk tipe PERCENT tidak boleh lebih dari 100",
      path: ["value"],
    },
  );

export const validateVoucherSchema = z.object({
  code: z.string().min(1, "Kode voucher wajib diisi"),
  total_amount: z
    .number("Total amount harus berupa angka")
    .min(1, "Total amount minimal 1"),
  customer_email: z
    .string()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid"),
});

export type CreateVoucherInput = z.infer<typeof createVoucherSchema>;
export type ValidateVoucherInput = z.infer<typeof validateVoucherSchema>;
