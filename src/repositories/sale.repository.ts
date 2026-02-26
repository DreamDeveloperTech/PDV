/**
 * Repository for Sale data access.
 */
import { prisma } from "@/lib/prisma";
import type { Sale, SaleItem, SalePayment, PaymentMethod } from "@/generated/prisma/client";

interface CreateSaleData {
  storeId: string;
  cashSessionId: string;
  customerId?: string;
  subtotal: number;
  discount: number;
  total: number;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  payments: {
    method: PaymentMethod;
    amount: number;
  }[];
}

export const saleRepository = {
  async findById(
    id: string
  ): Promise<
    | (Sale & {
        items: SaleItem[];
        payments: SalePayment[];
        customer: { name: string } | null;
      })
    | null
  > {
    return prisma.sale.findUnique({
      where: { id },
      include: {
        items: true,
        payments: true,
        customer: { select: { name: true } },
      },
    });
  },

  async findByCashSessionId(
    cashSessionId: string
  ): Promise<(Sale & { items: SaleItem[]; payments: SalePayment[] })[]> {
    return prisma.sale.findMany({
      where: { cashSessionId },
      include: { items: true, payments: true },
      orderBy: { createdAt: "desc" },
    });
  },

  /**
   * Creates a sale with all items and payments in a single transaction.
   * This ensures atomicity - either all parts are created or none.
   */
  async create(data: CreateSaleData): Promise<Sale> {
    return prisma.sale.create({
      data: {
        storeId: data.storeId,
        cashSessionId: data.cashSessionId,
        customerId: data.customerId,
        subtotal: data.subtotal,
        discount: data.discount,
        total: data.total,
        items: {
          create: data.items,
        },
        payments: {
          create: data.payments,
        },
      },
      include: {
        items: true,
        payments: true,
      },
    });
  },

  /** Sum revenue for a store in a given date range */
  async sumRevenueByStore(
    storeId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<number> {
    const where = {
      storeId,
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
    };

    const result = await prisma.sale.aggregate({
      where,
      _sum: { total: true },
    });

    return result._sum.total ?? 0;
  },

  /** Sum global revenue across all stores */
  async sumRevenueGlobal(startDate?: Date, endDate?: Date): Promise<number> {
    const where = {
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
    };

    const result = await prisma.sale.aggregate({
      where,
      _sum: { total: true },
    });

    return result._sum.total ?? 0;
  },

  async countByStoreId(storeId: string): Promise<number> {
    return prisma.sale.count({ where: { storeId } });
  },
};
