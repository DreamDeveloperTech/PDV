/**
 * Repository for Product data access.
 */
import { prisma } from "@/lib/prisma";
import type { Product } from "@/generated/prisma/client";
import type { CreateProductInput, UpdateProductInput } from "@/schemas/product.schema";

export const productRepository = {
  async findById(id: string): Promise<Product | null> {
    return prisma.product.findUnique({
      where: { id },
    });
  },

  async findByIdWithBaseAndIngredients(id: string) {
    return prisma.product.findUnique({
      where: { id },
      include: {
        baseProduct: true,
        ingredients: { include: { ingredient: true } },
      },
    });
  },

  async findByStoreId(
    storeId: string,
    options?: { search?: string; page?: number; pageSize?: number; activeOnly?: boolean; forPdv?: boolean; all?: boolean }
  ): Promise<{ data: Product[]; total: number }> {
    const page = options?.page ?? 1;
    const pageSize = options?.all ? undefined : (options?.pageSize ?? 20);
    const skip = options?.all ? undefined : (page - 1) * (pageSize ?? 20);
    const activeOnly = options?.activeOnly ?? true;

    const where = {
      storeId,
      ...(activeOnly ? { isActive: true } : {}),
      ...(options?.search
        ? {
            OR: [
              { name: { contains: options.search, mode: "insensitive" as const } },
              { barcode: { contains: options.search, mode: "insensitive" as const } },
              { sku: { contains: options.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const include = options?.forPdv
      ? {
          baseProduct: { select: { stock: true } },
          ingredients: { include: { ingredient: { select: { stock: true } } } },
        }
      : undefined;

    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        ...(skip != null ? { skip } : {}),
        ...(pageSize != null ? { take: pageSize } : {}),
        orderBy: { name: "asc" },
        ...(include ? { include } : {}),
      }),
      prisma.product.count({ where }),
    ]);

    return { data, total };
  },

  async create(storeId: string, data: CreateProductInput): Promise<Product> {
    const isDerived = data.baseProductId != null && data.conversionFactor != null;
    return prisma.product.create({
      data: {
        ...data,
        storeId,
        ...(isDerived ? { stock: 0 } : {}),
      },
    });
  },

  async update(id: string, data: UpdateProductInput): Promise<Product> {
    return prisma.product.update({
      where: { id },
      data,
    });
  },

  async updateStock(id: string, newStock: number): Promise<Product> {
    return prisma.product.update({
      where: { id },
      data: { stock: newStock },
    });
  },

  /** Hard delete: remove product. Fails if product has sales, is used as ingredient, or has derived products. */
  async delete(id: string): Promise<Product> {
    return prisma.product.delete({
      where: { id },
    });
  },

  /** Check if product can be deleted (no sale items, not used as ingredient, no derived products). */
  async getDeleteConstraints(productId: string): Promise<{
    saleItems: number;
    usedAsIngredient: number;
    derivedProducts: number;
  }> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        _count: {
          select: {
            saleItems: true,
            usedInProducts: true,
            derivedProducts: true,
          },
        },
      },
    });
    if (!product) return { saleItems: 0, usedAsIngredient: 0, derivedProducts: 0 };
    return {
      saleItems: product._count.saleItems,
      usedAsIngredient: product._count.usedInProducts,
      derivedProducts: product._count.derivedProducts,
    };
  },

  /**
   * Find products with stock at or below minStock.
   * Considera apenas produtos com notifyLowStock = true.
   * A regra de “não notificar derivados/doses/etc.” é controlada pelo próprio flag.
   */
  async findLowStock(storeId: string): Promise<Product[]> {
    const products = await prisma.product.findMany({
      where: {
        storeId,
        isActive: true,
        notifyLowStock: true,
      },
      orderBy: { stock: "asc" },
    });
    return products.filter((p) => p.stock <= p.minStock);
  },

  async countByStoreId(storeId: string): Promise<number> {
    return prisma.product.count({
      where: { storeId, isActive: true },
    });
  },
};
