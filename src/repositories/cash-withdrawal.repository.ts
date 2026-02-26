/**
 * Repository for CashWithdrawal (sangria) data access.
 */
import { prisma } from "@/lib/prisma";

export const cashWithdrawalRepository = {
  async create(cashSessionId: string, amount: number, withdrawnBy: string, notes?: string) {
    return prisma.cashWithdrawal.create({
      data: { cashSessionId, amount, withdrawnBy, notes },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  },

  async findByCashSessionId(cashSessionId: string) {
    return prisma.cashWithdrawal.findMany({
      where: { cashSessionId },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  },

  async sumByCashSessionId(cashSessionId: string): Promise<number> {
    const result = await prisma.cashWithdrawal.aggregate({
      where: { cashSessionId },
      _sum: { amount: true },
    });
    return result._sum.amount ?? 0;
  },
};
