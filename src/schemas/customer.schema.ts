/**
 * Zod validation schemas for Customer domain.
 */
import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(200),
  document: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  creditLimit: z.number().min(0, "Limite de crédito não pode ser negativo").default(0),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
