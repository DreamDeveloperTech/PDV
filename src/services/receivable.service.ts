/**
 * Receivable service - business logic for FIADO (accounts receivable).
 * Handles credit validation, partial payments, and automatic credit blocking.
 */
import { receivableRepository, receivablePaymentRepository } from "@/repositories/receivable.repository";
import { customerRepository } from "@/repositories/customer.repository";
import { NotFoundError, BusinessRuleError, ValidationError } from "@/lib/errors";
import type { ReceivablePaymentInput } from "@/schemas/receivable.schema";
import type { ReceivableStatus } from "@/generated/prisma/client";

export const receivableService = {
  async getReceivables(storeId: string, options?: { status?: ReceivableStatus; page?: number; pageSize?: number }) {
    return receivableRepository.findByStoreId(storeId, options);
  },

  async getReceivableById(id: string) {
    const receivable = await receivableRepository.findById(id);
    if (!receivable) {
      throw new NotFoundError("Conta a receber");
    }
    return receivable;
  },

  /** Get full ledger (extrato) for a customer */
  async getCustomerLedger(customerId: string) {
    return receivableRepository.findByCustomerId(customerId);
  },

  /**
   * Validate if a customer can take on more credit (FIADO).
   * Checks credit limit, blocked status, and outstanding balance.
   */
  async validateCreditForSale(customerId: string, saleAmount: number): Promise<void> {
    const customer = await customerRepository.findById(customerId);
    if (!customer) {
      throw new NotFoundError("Cliente");
    }

    if (customer.blockedForCredit) {
      throw new BusinessRuleError(
        `Cliente ${customer.name} está bloqueado para crédito`
      );
    }

    if (customer.creditLimit > 0) {
      const outstanding = await receivableRepository.sumOutstandingByCustomer(customerId);
      const newTotal = outstanding + saleAmount;

      if (newTotal > customer.creditLimit) {
        throw new BusinessRuleError(
          `Limite de crédito excedido. Limite: R$ ${customer.creditLimit.toFixed(2)}, ` +
          `Saldo devedor: R$ ${outstanding.toFixed(2)}, ` +
          `Valor da venda: R$ ${saleAmount.toFixed(2)}`
        );
      }
    }
  },

  /**
   * Create a receivable entry linked to a sale.
   * Called internally by the sale service when payment includes FIADO.
   */
  async createFromSale(storeId: string, customerId: string, saleId: string, amount: number) {
    return receivableRepository.create({
      storeId,
      customerId,
      saleId,
      amount,
      description: `Venda fiado #${saleId.slice(-6)}`,
    });
  },

  /**
   * Register a payment on a receivable.
   * Handles partial payments and auto-updates status.
   * Automatically blocks customer if they exceed credit limit after payment.
   */
  async registerPayment(input: ReceivablePaymentInput) {
    const receivable = await receivableRepository.findById(input.receivableId);
    if (!receivable) {
      throw new NotFoundError("Conta a receber");
    }

    if (receivable.status === "PAID") {
      throw new BusinessRuleError("Esta conta já foi paga");
    }

    const remainingAmount = receivable.amount - receivable.paidAmount;
    if (input.amount > remainingAmount) {
      throw new ValidationError(
        `Valor do pagamento (R$ ${input.amount.toFixed(2)}) excede o saldo devedor (R$ ${remainingAmount.toFixed(2)})`
      );
    }

    // Create the payment record
    await receivablePaymentRepository.create(
      input.receivableId,
      input.amount,
      input.paymentMethod,
      input.notes
    );

    // Update the receivable
    const newPaidAmount = receivable.paidAmount + input.amount;
    const newStatus = newPaidAmount >= receivable.amount ? "PAID" : "PARTIAL";

    const updated = await receivableRepository.updatePayment(
      input.receivableId,
      newPaidAmount,
      newStatus
    );

    // Check if customer should be unblocked
    if (newStatus === "PAID") {
      await this.checkAndUpdateCreditBlock(receivable.customerId);
    }

    return updated;
  },

  /**
   * Check if customer should be blocked/unblocked based on their outstanding balance.
   * Called after payments and new sales.
   */
  async checkAndUpdateCreditBlock(customerId: string): Promise<void> {
    const customer = await customerRepository.findById(customerId);
    if (!customer) return;

    if (customer.creditLimit <= 0) return;

    const outstanding = await receivableRepository.sumOutstandingByCustomer(customerId);
    const shouldBlock = outstanding > customer.creditLimit;

    if (shouldBlock !== customer.blockedForCredit) {
      await customerRepository.updateCreditBlock(customerId, shouldBlock);
    }
  },

  /**
   * Cancel a receivable linked to a sale (e.g. when sale is cancelled).
   */
  async cancelBySaleId(saleId: string): Promise<void> {
    const receivable = await receivableRepository.findBySaleId(saleId);
    if (receivable) {
      await receivableRepository.setStatus(receivable.id, "CANCELLED");
      await this.checkAndUpdateCreditBlock(receivable.customerId);
    }
  },

  async getOutstandingByStore(storeId: string) {
    return receivableRepository.sumOutstandingByStore(storeId);
  },

  async getOutstandingGlobal() {
    return receivableRepository.sumOutstandingGlobal();
  },
};
