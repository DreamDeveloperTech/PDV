/**
 * Sale service - business logic for PDV sales.
 * Orchestrates stock deduction, payment processing, and receivable creation.
 */
import { prisma } from "@/lib/prisma";
import { saleRepository } from "@/repositories/sale.repository";
import { cashSessionRepository } from "@/repositories/cash-session.repository";
import { productRepository } from "@/repositories/product.repository";
import { productService } from "./product.service";
import { receivableService } from "./receivable.service";
import { isSessionExpiredForSales } from "./cash-session.service";
import { NotFoundError, BusinessRuleError, ValidationError } from "@/lib/errors";
import type { CreateSaleInput } from "@/schemas/sale.schema";
import type { PaymentMethod } from "@/generated/prisma/client";

const PAYMENT_METHODS: PaymentMethod[] = ["CASH", "CREDIT", "DEBIT", "PIX", "FIADO"];

export const saleService = {
  /**
   * Create a sale with all items and payments.
   * This is the main PDV operation:
   * 1. Validate cash session is open
   * 2. Validate all products exist and have sufficient stock
   * 3. Calculate totals
   * 4. Validate payment amounts match total
   * 5. If FIADO payment, validate customer credit
   * 6. Execute in transaction: create sale, deduct stock, create receivable
   */
  async createSale(storeId: string, input: CreateSaleInput, sellerName?: string | null) {
    // 1. Validate cash session (deve estar aberta e dentro do prazo de 24h)
    const session = await cashSessionRepository.findById(input.cashSessionId);
    if (!session || session.storeId !== storeId) {
      throw new NotFoundError("Sessão de caixa");
    }
    if (session.status !== "OPEN") {
      throw new BusinessRuleError("Sessão de caixa está fechada");
    }
    if (isSessionExpiredForSales(session.openedAt)) {
      throw new BusinessRuleError(
        "Este caixa está aberto há mais de 24h. Feche-o e abra um novo para registrar vendas."
      );
    }

    // 2. Load and validate all products
    const productIds = input.items.map((item) => item.productId);
    const products = await Promise.all(
      productIds.map((id) => productRepository.findById(id))
    );

    const itemsWithProduct = input.items.map((item, index) => {
      const product = products[index];
      if (!product) {
        throw new NotFoundError(`Produto ${item.productId}`);
      }
      if (product.storeId !== storeId) {
        throw new ValidationError("Produto não pertence a esta loja");
      }
      if (product.stock < item.quantity) {
        throw new ValidationError(
          `Estoque insuficiente para ${product.name}. Disponível: ${product.stock}`
        );
      }
      return {
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
        total: product.price * item.quantity,
      };
    });

    // 3. Calculate totals
    const subtotal = itemsWithProduct.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal - input.discount;

    if (total < 0) {
      throw new ValidationError("Desconto não pode ser maior que o subtotal");
    }

    // 4. Validate payments
    const paymentTotal = input.payments.reduce((sum, p) => sum + p.amount, 0);
    if (Math.abs(paymentTotal - total) > 0.01) {
      throw new ValidationError(
        `Total dos pagamentos (R$ ${paymentTotal.toFixed(2)}) não confere com o total da venda (R$ ${total.toFixed(2)})`
      );
    }

    // 5. If FIADO, validate customer credit
    const fiadoPayment = input.payments.find((p) => p.method === "FIADO");
    if (fiadoPayment) {
      if (!input.customerId) {
        throw new BusinessRuleError("Venda fiado requer um cliente vinculado");
      }
      await receivableService.validateCreditForSale(input.customerId, fiadoPayment.amount);
    }

    // 6. Execute everything in a transaction
    const sale = await prisma.$transaction(async () => {
      // Create the sale
      const createdSale = await saleRepository.create({
        storeId,
        cashSessionId: input.cashSessionId,
        customerId: input.customerId,
        subtotal,
        discount: input.discount,
        total,
        items: itemsWithProduct,
        payments: input.payments.map((p) => ({
          method: p.method as PaymentMethod,
          amount: p.amount,
        })),
      });

      // Deduct stock for each item
      const reason = sellerName ? `Venda - vendedor: ${sellerName}` : "Venda";
      for (const item of itemsWithProduct) {
        await productService.deductStockForSale(storeId, item.productId, item.quantity, reason);
      }

      // Create receivable if FIADO
      if (fiadoPayment && input.customerId) {
        await receivableService.createFromSale(
          storeId,
          input.customerId,
          createdSale.id,
          fiadoPayment.amount
        );

        // Check if customer should be blocked after this sale
        await receivableService.checkAndUpdateCreditBlock(input.customerId);
      }

      return createdSale;
    });

    return sale;
  },

  async getSaleById(id: string) {
    const sale = await saleRepository.findById(id);
    if (!sale) {
      throw new NotFoundError("Venda");
    }
    return sale;
  },

  async getSalesByCashSession(cashSessionId: string) {
    return saleRepository.findByCashSessionId(cashSessionId);
  },

  /** List sales with filters for history/reports */
  async getSalesHistory(
    storeId: string,
    filters: {
      from?: string;
      to?: string;
      customerId?: string;
      paymentMethod?: string;
      productId?: string;
      minTotal?: number;
      maxTotal?: number;
      page?: number;
      pageSize?: number;
    }
  ) {
    const fromDate = filters.from ? new Date(filters.from + "T00:00:00") : undefined;
    const toDate = filters.to ? new Date(filters.to + "T23:59:59.999") : undefined;
    const paymentMethod =
      filters.paymentMethod && PAYMENT_METHODS.includes(filters.paymentMethod as PaymentMethod)
        ? (filters.paymentMethod as PaymentMethod)
        : undefined;

    return saleRepository.findByStoreId(storeId, {
      from: fromDate,
      to: toDate,
      customerId: filters.customerId,
      paymentMethod,
      productId: filters.productId,
      minTotal: filters.minTotal,
      maxTotal: filters.maxTotal,
      page: filters.page,
      pageSize: filters.pageSize,
    });
  },
};
