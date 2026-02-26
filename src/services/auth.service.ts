/**
 * Auth service - handles user authentication and session management.
 * Bridges Supabase Auth with our internal User table.
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { userRepository } from "@/repositories/user.repository";
import { storeUserRepository, storeRepository } from "@/repositories/store.repository";
import { UnauthorizedError } from "@/lib/errors";
import { isMasterEmail } from "@/lib/utils";
import type { AuthUser, StoreUserContext } from "@/types";
import type { Role } from "@/generated/prisma/client";

export const authService = {
  /**
   * Get the current authenticated user from Supabase session.
   * Also upserts the user in our internal database.
   */
  async getCurrentUser(): Promise<AuthUser> {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();

    if (!supabaseUser || !supabaseUser.email) {
      throw new UnauthorizedError("Sessão inválida");
    }

    const user = await userRepository.upsert({
      email: supabaseUser.email,
      name: supabaseUser.user_metadata?.full_name ?? supabaseUser.user_metadata?.name ?? null,
      avatarUrl: supabaseUser.user_metadata?.avatar_url ?? null,
      supabaseId: supabaseUser.id,
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      supabaseId: user.supabaseId,
    };
  },

  /**
   * Get user context for a specific store.
   * Validates that the user has access to the store and returns their role.
   * MASTER users always have access to all stores.
   */
  async getStoreUserContext(storeId: string): Promise<StoreUserContext> {
    const user = await this.getCurrentUser();

    // MASTER has access to all stores
    if (isMasterEmail(user.email)) {
      const store = await storeRepository.findById(storeId);
      if (!store) {
        throw new UnauthorizedError("Loja não encontrada");
      }
      return { user, storeId, role: "MASTER" as Role };
    }

    const storeUser = await storeUserRepository.findByUserAndStore(user.id, storeId);
    if (!storeUser || !storeUser.isActive) {
      throw new UnauthorizedError("Você não tem acesso a esta loja");
    }

    return { user, storeId, role: storeUser.role };
  },

  /**
   * Check if user has one of the required roles.
   * Used for endpoint-level authorization.
   */
  requireRole(context: StoreUserContext, allowedRoles: Role[]): void {
    if (!allowedRoles.includes(context.role)) {
      throw new UnauthorizedError("Permissão insuficiente para esta ação");
    }
  },
};
