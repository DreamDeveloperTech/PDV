/**
 * Shared type definitions used across the application.
 * These complement Prisma-generated types with application-specific shapes.
 */
import type { Role } from "@/generated/prisma/client";

/** Authenticated user context available in server-side operations */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  supabaseId: string;
}

/** User with their role in a specific store */
export interface StoreUserContext {
  user: AuthUser;
  storeId: string;
  role: Role;
}

/** Standard paginated response */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Standard API success response */
export interface ApiResponse<T> {
  data: T;
}

/** Query parameters for list endpoints */
export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
