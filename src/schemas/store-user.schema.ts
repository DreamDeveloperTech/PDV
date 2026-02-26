/**
 * Zod schemas para gestão de membros de loja (funcionários).
 * Usado para validar payloads das rotas de StoreUser.
 */
import { z } from "zod";

export const storeUserRoleSchema = z.enum(["OWNER", "EMPLOYEE"]);

export const createStoreUserSchema = z.object({
  email: z.string().email("E-mail inválido"),
  role: storeUserRoleSchema,
});

export const updateStoreUserRoleSchema = z.object({
  role: storeUserRoleSchema,
});

export type StoreUserRoleInput = z.infer<typeof storeUserRoleSchema>;

