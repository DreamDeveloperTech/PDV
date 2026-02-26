/**
 * Cash session service - business logic for cash register sessions.
 */
import { cashSessionRepository } from "@/repositories/cash-session.repository";
import { saleRepository } from "@/repositories/sale.repository";
import { BusinessRuleError, NotFoundError } from "@/lib/errors";

export const cashSessionService = {
  async openSession(storeId: string, userId: string, openingAmount: number, notes?: string) {
    // Check if there's already an open session for this store
    const existing = await cashSessionRepository.findOpenByStoreId(storeId);
    if (existing) {
      throw new BusinessRuleError("Já existe um caixa aberto para esta loja");
    }

    return cashSessionRepository.open(storeId, userId, openingAmount, notes);
  },

  async closeSession(sessionId: string, userId: string, closingAmount: number, notes?: string) {
    const session = await cashSessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundError("Sessão de caixa");
    }
    if (session.status !== "OPEN") {
      throw new BusinessRuleError("Esta sessão de caixa já está fechada");
    }

    return cashSessionRepository.close(sessionId, userId, closingAmount, notes);
  },

  async getOpenSession(storeId: string) {
    return cashSessionRepository.findOpenByStoreId(storeId);
  },

  async getSessionHistory(storeId: string, options?: { page?: number; pageSize?: number }) {
    return cashSessionRepository.findByStoreId(storeId, options);
  },

  async getSessionWithSales(sessionId: string) {
    const session = await cashSessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundError("Sessão de caixa");
    }

    const sales = await saleRepository.findByCashSessionId(sessionId);
    const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);

    return { session, sales, totalSales };
  },
};
