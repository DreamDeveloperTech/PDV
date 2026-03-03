/**
 * Zod validation schemas for Accounts Receivable (FIADO) domain.
 */
import { z } from "zod";

export const createReceivableSchema = z.object({
  customerId: z.string().min(1, "Cliente é obrigatório"),
  amount: z.number().min(0.01, "Valor deve ser maior que zero"),
  dueDate: z.string().optional(),
  description: z.string().optional(),
});

export const receivablePaymentSchema = z.object({
  receivableId: z.string().min(1, "Conta a receber é obrigatória"),
  amount: z.number().min(0.01, "Valor deve ser maior que zero"),
  paymentMethod: z.string().default("CASH"),
  notes: z.string().optional(),
});

export const updateReceivableSchema = z.object({
  amount: z.number().min(0.01, "Valor deve ser maior que zero").optional(),
  description: z.string().optional(),
  status: z.enum(["OPEN", "PARTIAL", "PAID", "CANCELLED"]).optional(),
});

export type CreateReceivableInput = z.infer<typeof createReceivableSchema>;
export type ReceivablePaymentInput = z.infer<typeof receivablePaymentSchema>;
export type UpdateReceivableInput = z.infer<typeof updateReceivableSchema>;
