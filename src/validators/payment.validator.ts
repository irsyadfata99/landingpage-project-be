import { z } from "zod";

export const chargePaymentSchema = z.object({
  order_id: z
    .string()
    .min(1, "order_id wajib diisi")
    .uuid("order_id harus berupa UUID yang valid"),
});

export type ChargePaymentInput = z.infer<typeof chargePaymentSchema>;
