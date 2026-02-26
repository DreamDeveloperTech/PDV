/**
 * Repository for User data access.
 * All database operations for the User model are centralized here.
 */
import { prisma } from "@/lib/prisma";
import type { User } from "@/generated/prisma/client";

interface UpsertUserData {
  email: string;
  name: string | null;
  avatarUrl: string | null;
  supabaseId: string;
}

export const userRepository = {
  async findBySupabaseId(supabaseId: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { supabaseId },
    });
  },

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  },

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  },

  /**
   * Creates or updates a user based on their Supabase ID.
   * Called after each authentication to keep user data in sync.
   */
  async upsert(data: UpsertUserData): Promise<User> {
    return prisma.user.upsert({
      where: { supabaseId: data.supabaseId },
      update: {
        email: data.email,
        name: data.name,
        avatarUrl: data.avatarUrl,
      },
      create: {
        email: data.email,
        name: data.name,
        avatarUrl: data.avatarUrl,
        supabaseId: data.supabaseId,
      },
    });
  },
};
