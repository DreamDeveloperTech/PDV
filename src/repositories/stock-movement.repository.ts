/**
 * Repository for StockMovement data access.
 */
import { prisma } from "@/lib/prisma";
import type { StockMovement, MovementType } from "@/generated/prisma/client";

interface CreateMovementData {
  storeId: string;
  productId: string;
  type: MovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason?: string;
}

export const stockMovementRepository = {
  async create(data: CreateMovementData): Promise<StockMovement> {
    return prisma.stockMovement.create({ data });
  },

  async findByProductId(
    productId: string,
    options?: { page?: number; pageSize?: number }
  ): Promise<{ data: StockMovement[]; total: number }> {
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where = { productId };

    const [data, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.stockMovement.count({ where }),
    ]);

    return { data, total };
  },

  async findByStoreId(
    storeId: string,
    options?: { page?: number; pageSize?: number }
  ): Promise<{ data: (StockMovement & { product: { name: string } })[]; total: number }> {
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where = { storeId };

    const [data, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: { product: { select: { name: true } } },
      }),
      prisma.stockMovement.count({ where }),
    ]);

    return { data, total };
  },
};
