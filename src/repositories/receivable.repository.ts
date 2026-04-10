/**
 * Repository for AccountReceivable and ReceivablePayment data access.
 */
import { prisma } from "@/lib/prisma";
import type { AccountReceivable, ReceivablePayment, ReceivableStatus } from "@/generated/prisma/client";

interface CreateReceivableData {
  storeId: string;
  customerId: string;
  saleId?: string;
  amount: number;
  dueDate?: Date;
  description?: string;
}

export const receivableRepository = {
  async findById(id: string): Promise<
    | (AccountReceivable & {
        customer: { name: string };
        payments: ReceivablePayment[];
      })
    | null
  > {
    return prisma.accountReceivable.findUnique({
      where: { id },
      include: {
        customer: { select: { name: true } },
        payments: { orderBy: { createdAt: "desc" } },
      },
    });
  },

  async findByStoreId(
    storeId: string,
    options?: { status?: ReceivableStatus; page?: number; pageSize?: number }
  ): Promise<{
    data: (AccountReceivable & {
      customer: { name: string };
      sale: { id: string; soldByName: string | null; items: { productName: string; quantity: number; unitPrice: number; total: number }[] } | null;
    })[];
    total: number;
  }> {
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where = {
      storeId,
      ...(options?.status ? { status: options.status } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.accountReceivable.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { name: true } },
          sale: { select: { id: true, soldByName: true, items: true } },
        },
      }),
      prisma.accountReceivable.count({ where }),
    ]);

    return { data, total };
  },

  /** Get all receivables for a specific customer (ledger/extrato) */
  async findByCustomerId(
    customerId: string
  ): Promise<(AccountReceivable & { payments: ReceivablePayment[] })[]> {
    return prisma.accountReceivable.findMany({
      where: { customerId },
      include: { payments: { orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
  },

  async create(data: CreateReceivableData): Promise<AccountReceivable> {
    return prisma.accountReceivable.create({ data });
  },

  async findBySaleId(saleId: string): Promise<AccountReceivable[]> {
    return prisma.accountReceivable.findMany({
      where: { saleId },
    });
  },

  async updatePayment(
    id: string,
    paidAmount: number,
    status: ReceivableStatus
  ): Promise<AccountReceivable> {
    return prisma.accountReceivable.update({
      where: { id },
      data: { paidAmount, status },
    });
  },

  async setStatus(id: string, status: ReceivableStatus): Promise<AccountReceivable> {
    return prisma.accountReceivable.update({
      where: { id },
      data: { status },
    });
  },

  async update(
    id: string,
    data: Partial<Pick<AccountReceivable, "amount" | "description" | "status">>
  ): Promise<AccountReceivable> {
    return prisma.accountReceivable.update({
      where: { id },
      data,
    });
  },

  /** Sum of all open/partial receivables for a customer */
  async sumOutstandingByCustomer(customerId: string): Promise<number> {
    const result = await prisma.accountReceivable.aggregate({
      where: {
        customerId,
        status: { in: ["OPEN", "PARTIAL"] },
      },
      _sum: { amount: true, paidAmount: true },
    });
    return (result._sum.amount ?? 0) - (result._sum.paidAmount ?? 0);
  },

  /** Saldo em aberto do cliente apenas nesta loja (escopo correto para pagamento em lote) */
  async sumOutstandingByStoreAndCustomer(
    storeId: string,
    customerId: string
  ): Promise<number> {
    const result = await prisma.accountReceivable.aggregate({
      where: {
        storeId,
        customerId,
        status: { in: ["OPEN", "PARTIAL"] },
      },
      _sum: { amount: true, paidAmount: true },
    });
    return (result._sum.amount ?? 0) - (result._sum.paidAmount ?? 0);
  },

  /** Títulos em aberto ou parcial, do mais antigo ao mais novo (quitação em lote FIFO) */
  async findOpenPartialByStoreAndCustomer(
    storeId: string,
    customerId: string
  ): Promise<AccountReceivable[]> {
    return prisma.accountReceivable.findMany({
      where: {
        storeId,
        customerId,
        status: { in: ["OPEN", "PARTIAL"] },
      },
      orderBy: { createdAt: "asc" },
    });
  },

  /** Sum of all outstanding receivables for a store */
  async sumOutstandingByStore(storeId: string): Promise<number> {
    const result = await prisma.accountReceivable.aggregate({
      where: {
        storeId,
        status: { in: ["OPEN", "PARTIAL"] },
      },
      _sum: { amount: true, paidAmount: true },
    });
    return (result._sum.amount ?? 0) - (result._sum.paidAmount ?? 0);
  },

  /** Sum of all outstanding receivables across all stores */
  async sumOutstandingGlobal(): Promise<number> {
    const result = await prisma.accountReceivable.aggregate({
      where: {
        status: { in: ["OPEN", "PARTIAL"] },
      },
      _sum: { amount: true, paidAmount: true },
    });
    return (result._sum.amount ?? 0) - (result._sum.paidAmount ?? 0);
  },
};

export const receivablePaymentRepository = {
  async create(
    receivableId: string,
    amount: number,
    paymentMethod: string,
    notes?: string
  ): Promise<ReceivablePayment> {
    return prisma.receivablePayment.create({
      data: { receivableId, amount, paymentMethod, notes },
    });
  },
};
