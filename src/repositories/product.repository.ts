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

  async findByStoreId(
    storeId: string,
    options?: { search?: string; page?: number; pageSize?: number; activeOnly?: boolean }
  ): Promise<{ data: Product[]; total: number }> {
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
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

    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { name: "asc" },
      }),
      prisma.product.count({ where }),
    ]);

    return { data, total };
  },

  async create(storeId: string, data: CreateProductInput): Promise<Product> {
    return prisma.product.create({
      data: { ...data, storeId },
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

  /** Find products with stock at or below their minimum stock level */
  async findLowStock(storeId: string): Promise<Product[]> {
    return prisma.product.findMany({
      where: {
        storeId,
        isActive: true,
        stock: { lte: prisma.product.fields.minStock },
      },
      orderBy: { stock: "asc" },
    });
  },

  async countByStoreId(storeId: string): Promise<number> {
    return prisma.product.count({
      where: { storeId, isActive: true },
    });
  },
};
