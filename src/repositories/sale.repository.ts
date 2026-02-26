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

  /** Sales for a cash session. Excludes cancelled by default so expectedCash is correct. */
  async findByCashSessionId(
    cashSessionId: string,
    options?: { includeCancelled?: boolean }
  ): Promise<(Sale & { items: SaleItem[]; payments: SalePayment[] })[]> {
    const where = {
      cashSessionId,
      ...(options?.includeCancelled ? {} : { cancelledAt: null }),
    };
    return prisma.sale.findMany({
      where,
      include: { items: true, payments: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async updateCancelled(saleId: string, cancelledBy: string): Promise<Sale> {
    return prisma.sale.update({
      where: { id: saleId },
      data: { cancelledAt: new Date(), cancelledBy },
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

  /** Sum revenue for a store in a given date range (excludes cancelled sales). */
  async sumRevenueByStore(
    storeId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<number> {
    const where = {
      storeId,
      cancelledAt: null,
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

  /** Sum global revenue across all stores (excludes cancelled sales). */
  async sumRevenueGlobal(startDate?: Date, endDate?: Date): Promise<number> {
    const where = {
      cancelledAt: null,
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

  /** List sales with filters and pagination for history/reports */
  async findByStoreId(
    storeId: string,
    options: {
      from?: Date;
      to?: Date;
      customerId?: string;
      paymentMethod?: PaymentMethod;
      productId?: string;
      minTotal?: number;
      maxTotal?: number;
      page?: number;
      pageSize?: number;
    } = {}
  ): Promise<{
    data: (Sale & {
      items: SaleItem[];
      payments: SalePayment[];
      customer: { id: string; name: string } | null;
    })[];
    total: number;
  }> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where = {
      storeId,
      ...(options.from || options.to
        ? {
            createdAt: {
              ...(options.from ? { gte: options.from } : {}),
              ...(options.to ? { lte: options.to } : {}),
            },
          }
        : {}),
      ...(options.customerId ? { customerId: options.customerId } : {}),
      ...(options.paymentMethod
        ? { payments: { some: { method: options.paymentMethod } } }
        : {}),
      ...(options.productId
        ? { items: { some: { productId: options.productId } } }
        : {}),
      ...(options.minTotal != null || options.maxTotal != null
        ? {
            total: {
              ...(options.minTotal != null ? { gte: options.minTotal } : {}),
              ...(options.maxTotal != null ? { lte: options.maxTotal } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          items: true,
          payments: true,
          customer: { select: { id: true, name: true } },
        },
      }),
      prisma.sale.count({ where }),
    ]);

    return { data, total };
  },
};
