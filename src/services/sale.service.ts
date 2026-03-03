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

    // 2. Load and validate all products (use effective stock for derived/recipe)
    const productIds = input.items.map((item) => item.productId);
    const [products, effectiveStocks] = await Promise.all([
      Promise.all(productIds.map((id) => productRepository.findById(id))),
      Promise.all(productIds.map((id) => productService.getEffectiveStock(id))),
    ]);

    const itemsWithProduct = input.items.map((item, index) => {
      const product = products[index];
      const available = effectiveStocks[index];
      if (!product) {
        throw new NotFoundError(`Produto ${item.productId}`);
      }
      if (product.storeId !== storeId) {
        throw new ValidationError("Produto não pertence a esta loja");
      }
      if (available < item.quantity) {
        throw new ValidationError(
          `Estoque insuficiente para ${product.name}. Disponível: ${available}`
        );
      }
      const unitPrice = item.unitPrice ?? product.price;
      return {
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice,
        total: unitPrice * item.quantity,
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

    // 5. If FIADO, validate customer credit (single or multi-client)
    const fiadoTotal = input.payments
      .filter((p) => p.method === "FIADO")
      .reduce((sum, p) => sum + p.amount, 0);
    const hasFiado = fiadoTotal > 0.01;

    if (hasFiado) {
      const splits = input.fiadoSplits ?? [];
      const validSplits = splits.filter((s) => s.amount > 0);

      if (validSplits.length > 0) {
        const splitTotal = validSplits.reduce((sum, s) => sum + s.amount, 0);
        if (Math.abs(splitTotal - fiadoTotal) > 0.01) {
          throw new ValidationError(
            `Soma dos fiados por cliente (R$ ${splitTotal.toFixed(
              2
            )}) não confere com o total em FIADO (R$ ${fiadoTotal.toFixed(2)})`
          );
        }
        for (const split of validSplits) {
          await receivableService.validateCreditForSale(split.customerId, split.amount);
        }
      } else {
        if (!input.customerId) {
          throw new BusinessRuleError("Venda fiado requer um cliente vinculado");
        }
        await receivableService.validateCreditForSale(input.customerId, fiadoTotal);
      }
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
        soldByName: sellerName ?? null,
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

      // Create receivable(s) if FIADO
      if (hasFiado) {
        const splits = input.fiadoSplits ?? [];
        const validSplits = splits.filter((s) => s.amount > 0);

        if (validSplits.length > 0) {
          for (const split of validSplits) {
            await receivableService.createFromSale(
              storeId,
              split.customerId,
              createdSale.id,
              split.amount
            );
            await receivableService.checkAndUpdateCreditBlock(split.customerId);
          }
        } else if (input.customerId) {
          await receivableService.createFromSale(
            storeId,
            input.customerId,
            createdSale.id,
            fiadoTotal
          );
          await receivableService.checkAndUpdateCreditBlock(input.customerId);
        }
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

  /**
   * Cancel a sale: revert stock, cancel receivable if FIADO.
   * Only MASTER/OWNER may cancel; password is verified by the API before calling this.
   * Allowed at any time (caixa aberto ou fechado) — funcionário não tem acesso ao cancelamento.
   */
  async cancelSale(storeId: string, saleId: string, cancelledByUserId: string) {
    const sale = await saleRepository.findById(saleId);
    if (!sale) {
      throw new NotFoundError("Venda");
    }
    if (sale.storeId !== storeId) {
      throw new ValidationError("Venda não pertence a esta loja");
    }
    if (sale.cancelledAt != null) {
      throw new BusinessRuleError("Esta venda já está cancelada");
    }

    await prisma.$transaction(async () => {
      await saleRepository.updateCancelled(saleId, cancelledByUserId);

      const reason = "Cancelamento de venda";
      for (const item of sale.items) {
        await productService.addStockForCancellation(
          storeId,
          item.productId,
          item.quantity,
          reason
        );
      }

      await receivableService.cancelBySaleId(saleId);
    });

    return saleRepository.findById(saleId);
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
