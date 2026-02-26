/**
 * Cash session service - business logic for cash register sessions.
 */
import { cashSessionRepository } from "@/repositories/cash-session.repository";
import { cashWithdrawalRepository } from "@/repositories/cash-withdrawal.repository";
import { saleRepository } from "@/repositories/sale.repository";
import { storeUserRepository } from "@/repositories/store.repository";
import { BusinessRuleError, NotFoundError, ValidationError } from "@/lib/errors";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

function getCashInSales(sales: { payments: { method: string; amount: number }[] }[]): number {
  return sales.reduce((sum, sale) => {
    const cashPayments = sale.payments.filter((p) => p.method === "CASH");
    const saleCashTotal = cashPayments.reduce((s, p) => s + p.amount, 0);
    return sum + saleCashTotal;
  }, 0);
}

/** Sessão não permite novas vendas após 24h da abertura. */
export function isSessionExpiredForSales(openedAt: Date | string): boolean {
  const opened = typeof openedAt === "string" ? new Date(openedAt).getTime() : openedAt.getTime();
  return Date.now() - opened > TWENTY_FOUR_HOURS_MS;
}

export const cashSessionService = {
  /**
   * Abre o caixa ou retorna o caixa já aberto (compartilhado por todos os colaboradores).
   * Só cria nova sessão se não existir nenhuma aberta; senão devolve a sessão atual.
   */
  async openSession(storeId: string, userId: string, openingAmount: number, notes?: string) {
    const existing = await cashSessionRepository.findMostRecentOpenByStoreId(storeId);
    if (existing) {
      const full = await this.getOpenSession(storeId);
      return { session: full, alreadyOpen: true };
    }
    await cashSessionRepository.open(storeId, userId, openingAmount, notes);
    const full = await this.getOpenSession(storeId);
    if (!full) throw new BusinessRuleError("Falha ao obter sessão após abertura");
    return { session: full, alreadyOpen: false };
  },

  async closeSession(sessionId: string, userId: string, closingAmount: number, notes?: string) {
    const session = await cashSessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundError("Sessão de caixa");
    }
    if (session.status !== "OPEN") {
      throw new BusinessRuleError("Esta sessão de caixa já está fechada");
    }

    const [sales, totalWithdrawals] = await Promise.all([
      saleRepository.findByCashSessionId(sessionId),
      cashWithdrawalRepository.sumByCashSessionId(sessionId),
    ]);
    const cashInSales = getCashInSales(sales);
    const expectedCash = session.openingAmount + cashInSales - totalWithdrawals;

    if (closingAmount < expectedCash - 0.01) {
      throw new BusinessRuleError(
        `O valor informado (R$ ${closingAmount.toFixed(2)}) é menor que o esperado em caixa (R$ ${expectedCash.toFixed(2)}). Não é possível fechar o caixa com valor menor.`
      );
    }

    return cashSessionRepository.close(sessionId, userId, closingAmount, notes);
  },

  async getOpenSession(storeId: string) {
    const session = await cashSessionRepository.findMostRecentOpenByStoreId(storeId);
    if (!session) {
      return null;
    }

    const [sales, withdrawals, totalWithdrawals] = await Promise.all([
      saleRepository.findByCashSessionId(session.id),
      cashWithdrawalRepository.findByCashSessionId(session.id),
      cashWithdrawalRepository.sumByCashSessionId(session.id),
    ]);
    const cashInSales = getCashInSales(sales);
    const expectedCash = session.openingAmount + cashInSales - totalWithdrawals;
    const isExpiredForSales = isSessionExpiredForSales(session.openedAt);

    return {
      ...session,
      expectedCash,
      withdrawals,
      totalWithdrawals,
      isExpiredForSales,
    };
  },

  async registerWithdrawal(
    storeId: string,
    sessionId: string,
    withdrawnBy: string,
    amount: number,
    notes?: string
  ) {
    const session = await cashSessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundError("Sessão de caixa");
    }
    if (session.storeId !== storeId) {
      throw new ValidationError("Sessão não pertence a esta loja");
    }
    if (session.status !== "OPEN") {
      throw new BusinessRuleError("Esta sessão de caixa já está fechada");
    }
    if (amount <= 0) {
      throw new ValidationError("Valor da sangria deve ser maior que zero");
    }

    const member = await storeUserRepository.findByUserAndStore(withdrawnBy, storeId);
    if (!member || !member.isActive) {
      throw new ValidationError("Usuário informado não está vinculado a esta loja");
    }

    const [sales, totalWithdrawals] = await Promise.all([
      saleRepository.findByCashSessionId(sessionId),
      cashWithdrawalRepository.sumByCashSessionId(sessionId),
    ]);
    const cashInSales = getCashInSales(sales);
    const currentCash = session.openingAmount + cashInSales - totalWithdrawals;

    if (amount > currentCash + 0.01) {
      throw new BusinessRuleError(
        `Valor da sangria (R$ ${amount.toFixed(2)}) é maior que o disponível em caixa (R$ ${currentCash.toFixed(2)})`
      );
    }

    return cashWithdrawalRepository.create(sessionId, amount, withdrawnBy, notes);
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
