/**
 * Repository for CashSession data access.
 */
import { prisma } from "@/lib/prisma";
import type { CashSession } from "@/generated/prisma/client";

export const cashSessionRepository = {
  async findById(id: string): Promise<CashSession | null> {
    return prisma.cashSession.findUnique({
      where: { id },
    });
  },

  /** Find currently open session for a store */
  async findOpenByStoreId(storeId: string): Promise<CashSession | null> {
    return prisma.cashSession.findFirst({
      where: { storeId, status: "OPEN" },
    });
  },

  async findByStoreId(
    storeId: string,
    options?: { page?: number; pageSize?: number }
  ): Promise<{ data: CashSession[]; total: number }> {
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where = { storeId };

    const [data, total] = await Promise.all([
      prisma.cashSession.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { openedAt: "desc" },
      }),
      prisma.cashSession.count({ where }),
    ]);

    return { data, total };
  },

  async open(storeId: string, openedBy: string, openingAmount: number, notes?: string): Promise<CashSession> {
    return prisma.cashSession.create({
      data: { storeId, openedBy, openingAmount, notes },
    });
  },

  async close(id: string, closedBy: string, closingAmount: number, notes?: string): Promise<CashSession> {
    return prisma.cashSession.update({
      where: { id },
      data: {
        closedBy,
        closingAmount,
        status: "CLOSED",
        closedAt: new Date(),
        notes,
      },
    });
  },
};
