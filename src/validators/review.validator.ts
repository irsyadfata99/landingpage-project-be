import { z } from "zod";

export const createReviewSchema = z.object({
  product_id: z
    .string()
    .min(1, "product_id wajib diisi")
    .uuid("product_id harus berupa UUID yang valid"),

  order_id: z
    .string()
    .min(1, "order_id wajib diisi")
    .uuid("order_id harus berupa UUID yang valid"),

  customer_email: z
    .string()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid"),

  rating: z
    .number("Rating harus berupa angka")
    .int("Rating harus bilangan bulat")
    .min(1, "Rating minimal 1")
    .max(5, "Rating maksimal 5"),

  comment: z.string().max(1000, "Komentar maksimal 1000 karakter").optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
