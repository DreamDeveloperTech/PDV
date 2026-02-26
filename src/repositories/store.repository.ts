/**
 * Repository for Store and StoreUser data access.
 */
import { prisma } from "@/lib/prisma";
import type { Store, StoreUser, Role } from "@/generated/prisma/client";
import type { CreateStoreInput, UpdateStoreInput } from "@/schemas/store.schema";

export const storeRepository = {
  async findById(id: string): Promise<Store | null> {
    return prisma.store.findUnique({
      where: { id },
    });
  },

  async findBySlug(slug: string): Promise<Store | null> {
    return prisma.store.findUnique({
      where: { slug },
    });
  },

  async findAll(): Promise<Store[]> {
    return prisma.store.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  },

  async findAllWithInactive(): Promise<Store[]> {
    return prisma.store.findMany({
      orderBy: { name: "asc" },
    });
  },

  async findByUserId(userId: string): Promise<(StoreUser & { store: Store })[]> {
    return prisma.storeUser.findMany({
      where: { userId, isActive: true },
      include: { store: true },
      orderBy: { store: { name: "asc" } },
    });
  },

  async create(data: CreateStoreInput): Promise<Store> {
    return prisma.store.create({ data });
  },

  async update(id: string, data: UpdateStoreInput): Promise<Store> {
    return prisma.store.update({
      where: { id },
      data,
    });
  },

  async countAll(): Promise<number> {
    return prisma.store.count({ where: { isActive: true } });
  },

  async setActive(id: string, isActive: boolean): Promise<Store> {
    return prisma.store.update({
      where: { id },
      data: { isActive },
    });
  },

  async delete(id: string): Promise<void> {
    await prisma.store.delete({
      where: { id },
    });
  },
};

export const storeUserRepository = {
  async findById(id: string): Promise<StoreUser | null> {
    return prisma.storeUser.findUnique({
      where: { id },
    });
  },

  async findByUserAndStore(userId: string, storeId: string): Promise<StoreUser | null> {
    return prisma.storeUser.findUnique({
      where: { userId_storeId: { userId, storeId } },
    });
  },

  async create(userId: string, storeId: string, role: Role): Promise<StoreUser> {
    return prisma.storeUser.create({
      data: { userId, storeId, role },
    });
  },

  async findByStoreId(storeId: string): Promise<(StoreUser & { user: { id: string; email: string; name: string | null } })[]> {
    return prisma.storeUser.findMany({
      where: { storeId, isActive: true },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });
  },

  async updateRole(id: string, role: Role): Promise<StoreUser> {
    return prisma.storeUser.update({
      where: { id },
      data: { role },
    });
  },

  async deactivate(id: string): Promise<StoreUser> {
    return prisma.storeUser.update({
      where: { id },
      data: { isActive: false },
    });
  },
};
