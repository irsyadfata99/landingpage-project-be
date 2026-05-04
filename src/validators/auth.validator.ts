import { z } from "zod";

// ==========================================
// AUTH VALIDATORS (Zod v4 compatible)
// Zod v4: required_error & invalid_type_error dihapus → pakai .error() atau message string
// ==========================================

// POST /api/admin/login
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid")
    .max(255, "Email maksimal 255 karakter"),

  password: z
    .string()
    .min(1, "Password wajib diisi")
    .max(100, "Password terlalu panjang"),
});

// PUT /api/admin/password
export const changePasswordSchema = z.object({
  old_password: z.string().min(1, "Password lama wajib diisi"),

  new_password: z
    .string()
    .min(6, "Password baru minimal 6 karakter")
    .max(100, "Password terlalu panjang"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
