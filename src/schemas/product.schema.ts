/**
 * Zod validation schemas for Product domain.
 */
import { z } from "zod";

const baseProductObjectSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(200),
  description: z.string().optional(),
  barcode: z.string().optional(),
  sku: z.string().optional(),
  cost: z.number().min(0, "Custo não pode ser negativo"),
  price: z.number().min(0.01, "Preço deve ser maior que zero"),
  stock: z.number().min(0, "Estoque não pode ser negativo"),
  minStock: z.number().min(0, "Estoque mínimo não pode ser negativo"),
  unit: z.string().default("un"),
  // Flag para indicar se o produto deve participar de alertas de estoque baixo.
  // Para produtos derivados/receita, essa flag é ignorada nas consultas.
  notifyLowStock: z.boolean().default(true),
  baseProductId: z.string().optional(),
  conversionFactor: z.number().positive("Fator deve ser maior que zero").optional(),
});

const derivedProductRefine = (data: { baseProductId?: string | null; conversionFactor?: number | null }) => {
  if (data.baseProductId && data.conversionFactor == null) return false;
  if (!data.baseProductId && data.conversionFactor != null) return false;
  return true;
};

export const createProductSchema = baseProductObjectSchema.refine(
  derivedProductRefine,
  { message: "Produto derivado exige produto base e fator de conversão", path: ["conversionFactor"] }
);

export const updateProductSchema = baseProductObjectSchema
  .partial()
  .extend({
    baseProductId: z.string().nullable().optional(),
    conversionFactor: z.number().positive("Fator deve ser maior que zero").nullable().optional(),
  })
  .refine(
    derivedProductRefine,
    { message: "Produto derivado exige produto base e fator de conversão", path: ["conversionFactor"] }
  );

export const productIngredientSchema = z.object({
  ingredientProductId: z.string().min(1, "Produto ingrediente é obrigatório"),
  quantityPerUnit: z.number().positive("Quantidade por unidade deve ser maior que zero"),
});

export const setProductIngredientsSchema = z.object({
  ingredients: z.array(productIngredientSchema),
});

export type ProductIngredientInput = z.infer<typeof productIngredientSchema>;
export type SetProductIngredientsInput = z.infer<typeof setProductIngredientsSchema>;

export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1, "Produto é obrigatório"),
  quantity: z.number().refine((val) => val !== 0, "Quantidade não pode ser zero"),
  type: z.enum(["RESTOCK", "ADJUSTMENT"]),
  reason: z.string().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
