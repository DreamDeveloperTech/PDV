/**
 * Product service - business logic for product and stock management.
 * Handles derived products (e.g. box = N units) and recipe/dose ingredients.
 */
import { productRepository } from "@/repositories/product.repository";
import { productIngredientRepository } from "@/repositories/product-ingredient.repository";
import { stockMovementRepository } from "@/repositories/stock-movement.repository";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type { CreateProductInput, UpdateProductInput, StockAdjustmentInput } from "@/schemas/product.schema";
import type { MovementType } from "@/generated/prisma/client";

export const productService = {
  async getProducts(
    storeId: string,
    options?: { search?: string; page?: number; pageSize?: number; forPdv?: boolean }
  ) {
    const result = await productRepository.findByStoreId(storeId, options);
    if (!options?.forPdv || !result.data.length) return result;

    const dataWithEffectiveStock = result.data.map((p: { baseProduct?: { stock: number } | null; conversionFactor?: number | null; ingredients?: { quantityPerUnit: number; ingredient: { stock: number } }[] }) => {
      let effectiveStock = (p as { stock: number }).stock;
      if (p.baseProduct != null && p.conversionFactor != null && p.conversionFactor > 0) {
        effectiveStock = Math.floor(p.baseProduct.stock / p.conversionFactor);
      } else if (p.ingredients?.length) {
        effectiveStock = Math.min(
          ...p.ingredients.map((i) =>
            i.quantityPerUnit > 0 ? Math.floor(i.ingredient.stock / i.quantityPerUnit) : 0
          )
        );
      }
      return { ...p, effectiveStock };
    });
    return { data: dataWithEffectiveStock, total: result.total };
  },

  async getProductById(id: string) {
    const product = await productRepository.findById(id);
    if (!product) {
      throw new NotFoundError("Produto");
    }
    return product;
  },

  async getProductWithRelations(id: string) {
    return productRepository.findByIdWithBaseAndIngredients(id);
  },

  async createProduct(storeId: string, input: CreateProductInput, operatorName?: string) {
    if (input.baseProductId != null && input.conversionFactor != null) {
      const base = await productRepository.findById(input.baseProductId);
      if (!base) throw new NotFoundError("Produto base");
      if (base.storeId !== storeId) throw new ValidationError("Produto base deve ser da mesma loja");
      if (base.baseProductId != null) throw new ValidationError("Produto base não pode ser outro derivado");
    }

    const product = await productRepository.create(storeId, input);

    if (!(input.baseProductId != null && input.conversionFactor != null) && input.stock > 0) {
      await stockMovementRepository.create({
        storeId,
        productId: product.id,
        type: "RESTOCK",
        quantity: input.stock,
        previousStock: 0,
        newStock: input.stock,
        reason: operatorName ? `Estoque inicial - por: ${operatorName}` : "Estoque inicial",
      });
    }

    return product;
  },

  async updateProduct(id: string, input: UpdateProductInput) {
    const product = await productRepository.findById(id);
    if (!product) {
      throw new NotFoundError("Produto");
    }
    if (input.baseProductId != null && input.conversionFactor != null) {
      const base = await productRepository.findById(input.baseProductId);
      if (!base) throw new NotFoundError("Produto base");
      if (base.storeId !== product.storeId) throw new ValidationError("Produto base deve ser da mesma loja");
      if (base.baseProductId != null) throw new ValidationError("Produto base não pode ser outro derivado");
      if (input.baseProductId === id) throw new ValidationError("Produto não pode ser base de si mesmo");
    }
    return productRepository.update(id, input);
  },

  async getProductIngredients(productId: string) {
    return productIngredientRepository.findByProductId(productId);
  },

  async setProductIngredients(storeId: string, productId: string, ingredients: { ingredientProductId: string; quantityPerUnit: number }[]) {
    const product = await productRepository.findById(productId);
    if (!product) throw new NotFoundError("Produto");
    if (product.storeId !== storeId) throw new ValidationError("Produto não pertence a esta loja");
    for (const ing of ingredients) {
      const ingProduct = await productRepository.findById(ing.ingredientProductId);
      if (!ingProduct || ingProduct.storeId !== storeId) throw new ValidationError(`Ingrediente ${ing.ingredientProductId} inválido`);
    }
    await productIngredientRepository.setIngredients(productId, ingredients);
  },

  /**
   * Adjust stock manually (RESTOCK or ADJUSTMENT).
   * Records a movement and updates the product stock atomically.
   */
  async adjustStock(storeId: string, input: StockAdjustmentInput) {
    const product = await productRepository.findById(input.productId);
    if (!product) {
      throw new NotFoundError("Produto");
    }

    if (product.storeId !== storeId) {
      throw new ValidationError("Produto não pertence a esta loja");
    }

    const previousStock = product.stock;
    const newStock = previousStock + input.quantity;

    if (newStock < 0) {
      throw new ValidationError("Estoque não pode ficar negativo");
    }

    await productRepository.updateStock(product.id, newStock);

    await stockMovementRepository.create({
      storeId,
      productId: product.id,
      type: input.type as MovementType,
      quantity: input.quantity,
      previousStock,
      newStock,
      reason: input.reason,
    });

    return { ...product, stock: newStock };
  },

  /**
   * Deduct stock for a single product (internal use).
   */
  async _deductSingle(storeId: string, productId: string, quantity: number, reason?: string) {
    const product = await productRepository.findById(productId);
    if (!product) throw new NotFoundError("Produto");
    if (product.storeId !== storeId) throw new ValidationError("Produto não pertence a esta loja");

    const previousStock = product.stock;
    const newStock = previousStock - quantity;
    if (newStock < 0) {
      throw new ValidationError(`Estoque insuficiente para ${product.name}. Disponível: ${previousStock}`);
    }

    await productRepository.updateStock(product.id, newStock);
    await stockMovementRepository.create({
      storeId,
      productId: product.id,
      type: "SALE",
      quantity: -quantity,
      previousStock,
      newStock,
      reason,
    });
    return { ...product, stock: newStock };
  },

  /**
   * Deduct stock for a sale. Handles derived products (deduct from base) and
   * recipe/dose products (deduct from each ingredient). Otherwise deducts from the product itself.
   */
  async deductStockForSale(storeId: string, productId: string, quantity: number, reason?: string) {
    const product = await productRepository.findByIdWithBaseAndIngredients(productId);
    if (!product) throw new NotFoundError("Produto");

    if (product.baseProductId != null && product.conversionFactor != null && product.baseProduct) {
      const deductQty = quantity * product.conversionFactor;
      await this._deductSingle(storeId, product.baseProductId, deductQty, reason);
      return;
    }

    if (product.ingredients && product.ingredients.length > 0) {
      for (const ing of product.ingredients) {
        const deductQty = quantity * ing.quantityPerUnit;
        await this._deductSingle(storeId, ing.ingredientProductId, deductQty, reason);
      }
      return;
    }

    await this._deductSingle(storeId, productId, quantity, reason);
  },

  async getLowStockProducts(storeId: string) {
    return productRepository.findLowStock(storeId);
  },

  async getStockMovements(
    storeId: string,
    options?: { page?: number; pageSize?: number; from?: Date; to?: Date }
  ) {
    return stockMovementRepository.findByStoreId(storeId, options);
  },

  async getProductMovements(productId: string, options?: { page?: number; pageSize?: number }) {
    return stockMovementRepository.findByProductId(productId, options);
  },

  /**
   * Effective sellable quantity: for derived = floor(base.stock / conversionFactor),
   * for recipe = min(ingredient.stock / quantityPerUnit), else product.stock.
   */
  async getEffectiveStock(productId: string): Promise<number> {
    const product = await productRepository.findByIdWithBaseAndIngredients(productId);
    if (!product) return 0;

    if (product.baseProductId != null && product.conversionFactor != null && product.baseProduct) {
      if (product.conversionFactor <= 0) return 0;
      return Math.floor(product.baseProduct.stock / product.conversionFactor);
    }

    if (product.ingredients && product.ingredients.length > 0) {
      let min = Infinity;
      for (const ing of product.ingredients) {
        if (ing.quantityPerUnit <= 0) return 0;
        const qty = Math.floor(ing.ingredient.stock / ing.quantityPerUnit);
        min = Math.min(min, qty);
      }
      return min === Infinity ? 0 : min;
    }

    return product.stock;
  },
};
