import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1, "Nama produk wajib diisi").max(255),
  description: z.string().optional(),
  price: z
    .number("Harga harus berupa angka")
    .min(0, "Harga tidak boleh negatif"),
  original_price: z.number("Harga coret harus berupa angka").min(0).optional(),
  product_type: z.enum(["PHYSICAL", "DIGITAL", "BOTH"], {
    error: "Tipe produk harus PHYSICAL, DIGITAL, atau BOTH",
  }),
  stock: z
    .number("Stok harus berupa angka")
    .int()
    .min(0, "Stok tidak boleh negatif")
    .optional(),
  download_url: z.string().url("Format URL download tidak valid").optional(),
  download_expires_hours: z
    .number("Jam expired harus berupa angka")
    .int()
    .min(1, "Minimal 1 jam")
    .max(8760, "Maksimal 8760 jam (1 tahun)")
    .optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
});

export const updateProductSchema = createProductSchema.partial();
