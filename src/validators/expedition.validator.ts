import { z } from "zod";

export const createExpeditionSchema = z.object({
  name: z.string().min(1, "Nama ekspedisi wajib diisi").max(255),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
});

export const updateExpeditionSchema = createExpeditionSchema.partial();
