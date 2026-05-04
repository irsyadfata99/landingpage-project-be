import { z } from "zod";

// ==========================================
// ORDER VALIDATORS (Zod v4 compatible)
// Zod v4: required_error & invalid_type_error dihapus → pakai .min(1) atau message string
// ==========================================

const orderItemSchema = z.object({
  product_id: z
    .string()
    .min(1, "product_id wajib diisi")
    .uuid("product_id harus berupa UUID yang valid"),

  quantity: z
    .number("quantity harus berupa angka")
    .int("quantity harus bilangan bulat")
    .min(1, "quantity minimal 1")
    .max(100, "quantity maksimal 100"),
});

// POST /api/orders
export const createOrderSchema = z
  .object({
    customer_name: z
      .string()
      .min(2, "Nama minimal 2 karakter")
      .max(255, "Nama maksimal 255 karakter"),

    customer_email: z
      .string()
      .min(1, "Email customer wajib diisi")
      .email("Format email tidak valid")
      .max(255, "Email maksimal 255 karakter"),

    customer_phone: z
      .string()
      .min(9, "Nomor HP minimal 9 digit")
      .max(20, "Nomor HP maksimal 20 karakter")
      .regex(/^[0-9+\-\s()]+$/, "Format nomor HP tidak valid"),

    customer_address: z
      .string()
      .max(500, "Alamat maksimal 500 karakter")
      .optional(),

    customer_city: z.string().max(255, "Kota maksimal 255 karakter").optional(),

    customer_province: z
      .string()
      .max(255, "Provinsi maksimal 255 karakter")
      .optional(),

    customer_postal_code: z
      .string()
      .regex(/^[0-9]{5}$/, "Kode pos harus 5 digit angka")
      .optional(),

    expedition_id: z
      .string()
      .uuid("expedition_id harus berupa UUID yang valid")
      .optional(),

    payment_method: z.enum(["bank_transfer", "qris"], {
      error: "Metode pembayaran harus bank_transfer atau qris",
    }),

    bank: z
      .enum(["bca", "bni", "bri", "mandiri"], {
        error: "Bank harus salah satu dari: bca, bni, bri, mandiri",
      })
      .optional(),

    items: z
      .array(orderItemSchema)
      .min(1, "Minimal 1 item dalam order")
      .max(20, "Maksimal 20 item dalam satu order"),

    notes: z.string().max(500, "Catatan maksimal 500 karakter").optional(),

    no_cancel_ack: z.literal(true, {
      error:
        "Anda harus menyetujui bahwa pesanan tidak dapat dibatalkan atau di-refund",
    }),
  })
  .refine(
    (data) => {
      if (data.payment_method === "bank_transfer" && !data.bank) {
        return false;
      }
      return true;
    },
    {
      message: "Bank wajib dipilih untuk metode transfer",
      path: ["bank"],
    },
  );

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
