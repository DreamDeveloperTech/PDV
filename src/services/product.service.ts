/**
 * Product service - business logic for product and stock management.
 */
import { productRepository } from "@/repositories/product.repository";
import { stockMovementRepository } from "@/repositories/stock-movement.repository";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type { CreateProductInput, UpdateProductInput, StockAdjustmentInput } from "@/schemas/product.schema";
import type { MovementType } from "@/generated/prisma/client";

export const productService = {
  async getProducts(storeId: string, options?: { search?: string; page?: number; pageSize?: number }) {
    return productRepository.findByStoreId(storeId, options);
  },

  async getProductById(id: string) {
    const product = await productRepository.findById(id);
    if (!product) {
      throw new NotFoundError("Produto");
    }
    return product;
  },

  async createProduct(storeId: string, input: CreateProductInput) {
    const product = await productRepository.create(storeId, input);

    // Record initial stock if any
    if (input.stock > 0) {
      await stockMovementRepository.create({
        storeId,
        productId: product.id,
        type: "RESTOCK",
        quantity: input.stock,
        previousStock: 0,
        newStock: input.stock,
        reason: "Estoque inicial",
      });
    }

    return product;
  },

  async updateProduct(id: string, input: UpdateProductInput) {
    const product = await productRepository.findById(id);
    if (!product) {
      throw new NotFoundError("Produto");
    }
    return productRepository.update(id, input);
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
   * Deduct stock for a sale.
   * Called internally by the sale service during sale creation.
   */
  async deductStockForSale(storeId: string, productId: string, quantity: number) {
    const product = await productRepository.findById(productId);
    if (!product) {
      throw new NotFoundError("Produto");
    }

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
    });

    return { ...product, stock: newStock };
  },

  async getLowStockProducts(storeId: string) {
    return productRepository.findLowStock(storeId);
  },

  async getStockMovements(storeId: string, options?: { page?: number; pageSize?: number }) {
    return stockMovementRepository.findByStoreId(storeId, options);
  },

  async getProductMovements(productId: string, options?: { page?: number; pageSize?: number }) {
    return stockMovementRepository.findByProductId(productId, options);
  },
};
