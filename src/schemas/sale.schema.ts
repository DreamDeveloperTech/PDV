/**
 * Zod validation schemas for Sale/PDV domain.
 */
import { z } from "zod";

export const saleItemSchema = z.object({
  productId: z.string().min(1, "Produto é obrigatório"),
  quantity: z.number().min(0.01, "Quantidade deve ser maior que zero"),
  /** Preço unitário usado na venda (ex.: preço de custo). Se omitido, o backend usa product.price */
  unitPrice: z.number().min(0, "Preço unitário não pode ser negativo").optional(),
});

export const salePaymentSchema = z.object({
  method: z.enum(["CASH", "CREDIT", "DEBIT", "PIX", "FIADO"]),
  amount: z.number().min(0.01, "Valor deve ser maior que zero"),
});

export const createSaleSchema = z.object({
  cashSessionId: z.string().min(1, "Sessão de caixa é obrigatória"),
  customerId: z.string().optional(),
  items: z.array(saleItemSchema).min(1, "A venda deve ter pelo menos um item"),
  payments: z.array(salePaymentSchema).min(1, "A venda deve ter pelo menos um pagamento"),
  discount: z.number().min(0).default(0),
});

export const openCashSessionSchema = z.object({
  openingAmount: z.number().min(0, "Valor inicial não pode ser negativo").default(0),
  notes: z.string().optional(),
});

export const closeCashSessionSchema = z.object({
  closingAmount: z.number().min(0, "Valor de fechamento não pode ser negativo"),
  notes: z.string().optional(),
});

export const withdrawCashSessionSchema = z.object({
  sessionId: z.string().min(1, "Sessão de caixa é obrigatória"),
  amount: z.number().min(0.01, "Valor da sangria deve ser maior que zero"),
  notes: z.string().optional(),
  /**
   * Usuário responsável pela retirada (opcional).
   * Se não vier, o backend usa o usuário logado.
   */
  withdrawnUserId: z.string().optional(),
});

export const cancelSaleSchema = z.object({
  password: z.string().min(1, "Senha é obrigatória para cancelar"),
});

export type SaleItemInput = z.infer<typeof saleItemSchema>;
export type SalePaymentInput = z.infer<typeof salePaymentSchema>;
export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type OpenCashSessionInput = z.infer<typeof openCashSessionSchema>;
export type CloseCashSessionInput = z.infer<typeof closeCashSessionSchema>;
export type WithdrawCashSessionInput = z.infer<typeof withdrawCashSessionSchema>;
export type CancelSaleInput = z.infer<typeof cancelSaleSchema>;
