/**
 * Store service - business logic for store management.
 */
import { storeRepository, storeUserRepository } from "@/repositories/store.repository";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { slugify } from "@/lib/utils";
import type { CreateStoreInput } from "@/schemas/store.schema";
import type { AuthUser } from "@/types";

export const storeService = {
  /** Create a new store and assign the creator as OWNER */
  async createStore(user: AuthUser, input: CreateStoreInput) {
    const slug = input.slug || slugify(input.name);

    const existing = await storeRepository.findBySlug(slug);
    if (existing) {
      throw new ConflictError("Já existe uma loja com este slug");
    }

    const store = await storeRepository.create({ ...input, slug });

    // Creator becomes OWNER of the new store
    await storeUserRepository.create(user.id, store.id, "OWNER");

    return store;
  },

  async getStoreById(id: string) {
    const store = await storeRepository.findById(id);
    if (!store) {
      throw new NotFoundError("Loja");
    }
    return store;
  },

  /** Get all stores the user has access to */
  async getUserStores(userId: string) {
    return storeRepository.findByUserId(userId);
  },

  /** Get all stores (MASTER only) */
  async getAllStores() {
    return storeRepository.findAll();
  },

  /** Get store members */
  async getStoreMembers(storeId: string) {
    return storeUserRepository.findByStoreId(storeId);
  },

  /** Invite a user to a store by their user ID */
  async addStoreUser(userId: string, storeId: string, role: "OWNER" | "EMPLOYEE") {
    const existing = await storeUserRepository.findByUserAndStore(userId, storeId);
    if (existing) {
      throw new ConflictError("Usuário já está vinculado a esta loja");
    }
    return storeUserRepository.create(userId, storeId, role);
  },
};
