/**
 * Store service - business logic for store management.
 */
import { storeRepository, storeUserRepository } from "@/repositories/store.repository";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { slugify } from "@/lib/utils";
import type { CreateStoreInput } from "@/schemas/store.schema";
import type { AuthUser } from "@/types";
import { userRepository } from "@/repositories/user.repository";
import type { Role } from "@/generated/prisma/client";

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

  /** Get all stores including inactive (MASTER admin) */
  async getAllStoresWithInactive() {
    return storeRepository.findAllWithInactive();
  },

  /** Get store members */
  async getStoreMembers(storeId: string) {
    return storeUserRepository.findByStoreId(storeId);
  },

  /**
   * Invite/add a user to a store by their user ID.
   * Internal helper reused by email-based invitation.
   */
  async addStoreUser(userId: string, storeId: string, role: "OWNER" | "EMPLOYEE") {
    const existing = await storeUserRepository.findByUserAndStore(userId, storeId);
    if (existing) {
      throw new ConflictError("Usuário já está vinculado a esta loja");
    }
    return storeUserRepository.create(userId, storeId, role);
  },

  /**
   * Invite/add a user to a store using their email.
   * The user must have logged in at least once (so that it exists in our User table).
   */
  async inviteStoreUserByEmail(storeId: string, email: string, role: "OWNER" | "EMPLOYEE") {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new ValidationError("Usuário não encontrado com este e-mail. Peça para o funcionário acessar o sistema pelo menos uma vez.");
    }
    return this.addStoreUser(user.id, storeId, role);
  },

  /**
   * Update the role of a store member, ensuring it belongs to the given store.
   */
  async updateStoreUserRole(id: string, storeId: string, role: Role) {
    const storeUser = await storeUserRepository.findById(id);
    if (!storeUser || storeUser.storeId !== storeId || !storeUser.isActive) {
      throw new NotFoundError("Membro da loja");
    }
    if (storeUser.role === role) {
      return storeUser;
    }
    return storeUserRepository.updateRole(id, role);
  },

  /**
   * Soft-delete (deactivate) a store member, ensuring it belongs to the given store.
   */
  async deactivateStoreUser(id: string, storeId: string) {
    const storeUser = await storeUserRepository.findById(id);
    if (!storeUser || storeUser.storeId !== storeId || !storeUser.isActive) {
      throw new NotFoundError("Membro da loja");
    }
    return storeUserRepository.deactivate(id);
  },

  /** Activate or deactivate a store (MASTER only) */
  async setStoreActive(id: string, isActive: boolean) {
    const store = await storeRepository.findById(id);
    if (!store) {
      throw new NotFoundError("Loja");
    }
    if (store.isActive === isActive) {
      return store;
    }
    return storeRepository.setActive(id, isActive);
  },

  /** Permanently delete a store and all related data (MASTER only) */
  async deleteStore(id: string) {
    const store = await storeRepository.findById(id);
    if (!store) {
      throw new NotFoundError("Loja");
    }
    await storeRepository.delete(id);
  },
};

