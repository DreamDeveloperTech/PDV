/**
 * Repository for Customer data access.
 */
import { prisma } from "@/lib/prisma";
import type { Customer } from "@/generated/prisma/client";
import type { CreateCustomerInput, UpdateCustomerInput } from "@/schemas/customer.schema";

export const customerRepository = {
  async findById(id: string): Promise<Customer | null> {
    return prisma.customer.findUnique({
      where: { id },
    });
  },

  async findByStoreId(
    storeId: string,
    options?: { search?: string; page?: number; pageSize?: number }
  ): Promise<{ data: Customer[]; total: number }> {
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where = {
      storeId,
      isActive: true,
      ...(options?.search
        ? {
            OR: [
              { name: { contains: options.search, mode: "insensitive" as const } },
              { document: { contains: options.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { name: "asc" },
      }),
      prisma.customer.count({ where }),
    ]);

    return { data, total };
  },

  async create(storeId: string, data: CreateCustomerInput): Promise<Customer> {
    return prisma.customer.create({
      data: {
        ...data,
        storeId,
        email: data.email || null,
      },
    });
  },

  async update(id: string, data: UpdateCustomerInput): Promise<Customer> {
    return prisma.customer.update({
      where: { id },
      data: {
        ...data,
        email: data.email || null,
      },
    });
  },

  async updateCreditBlock(id: string, blocked: boolean): Promise<Customer> {
    return prisma.customer.update({
      where: { id },
      data: { blockedForCredit: blocked },
    });
  },

  /** Find customers who are blocked or have outstanding debts */
  async findDefaulters(storeId: string): Promise<Customer[]> {
    return prisma.customer.findMany({
      where: {
        storeId,
        isActive: true,
        blockedForCredit: true,
      },
      orderBy: { name: "asc" },
    });
  },
};
