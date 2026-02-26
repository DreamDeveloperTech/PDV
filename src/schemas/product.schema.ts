/**
 * Zod validation schemas for Product domain.
 */
import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(200),
  description: z.string().optional(),
  barcode: z.string().optional(),
  sku: z.string().optional(),
  cost: z.number().min(0, "Custo não pode ser negativo"),
  price: z.number().min(0.01, "Preço deve ser maior que zero"),
  stock: z.number().min(0, "Estoque não pode ser negativo"),
  minStock: z.number().min(0, "Estoque mínimo não pode ser negativo"),
  unit: z.string().default("un"),
});

export const updateProductSchema = createProductSchema.partial();

export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1, "Produto é obrigatório"),
  quantity: z.number().refine((val) => val !== 0, "Quantidade não pode ser zero"),
  type: z.enum(["RESTOCK", "ADJUSTMENT"]),
  reason: z.string().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
