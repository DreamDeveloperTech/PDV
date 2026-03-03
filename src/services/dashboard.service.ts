/**
 * Dashboard service - aggregates metrics for different role-based views.
 */
import { storeRepository } from "@/repositories/store.repository";
import { saleRepository } from "@/repositories/sale.repository";
import { productRepository } from "@/repositories/product.repository";
import { receivableRepository } from "@/repositories/receivable.repository";
import { customerRepository } from "@/repositories/customer.repository";

export interface MasterDashboardData {
  totalStores: number;
  globalRevenue: number;
  globalOutstanding: number;
  monthlyRevenue: number;
}

export interface OwnerDashboardData {
  storeRevenue: number;
  monthlyRevenue: number; // usado como receita no período filtrado
  totalProducts: number;
  lowStockProducts: { id: string; name: string; stock: number; minStock: number }[];
  totalOutstanding: number;
  defaulters: { id: string; name: string }[];
  totalSales: number;
  paymentMethodsSummary: { method: string; amount: number }[];
}

export interface EmployeeDashboardData {
  todaySales: number;
  todayRevenue: number;
  openSession: boolean;
}

export const dashboardService = {
  async getMasterDashboard(from?: Date, to?: Date): Promise<MasterDashboardData> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const effectiveFrom = from ?? startOfMonth;
    const effectiveTo = to;

    const [totalStores, globalRevenue, globalOutstanding, monthlyRevenue] =
      await Promise.all([
        storeRepository.countAll(),
        saleRepository.sumRevenueGlobal(),
        receivableRepository.sumOutstandingGlobal(),
        saleRepository.sumRevenueGlobal(effectiveFrom, effectiveTo),
      ]);

    return { totalStores, globalRevenue, globalOutstanding, monthlyRevenue };
  },

  async getOwnerDashboard(storeId: string, from?: Date, to?: Date): Promise<OwnerDashboardData> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const effectiveFrom = from ?? startOfMonth;
    const effectiveTo = to;

    const [
      storeRevenue,
      monthlyRevenue,
      totalProducts,
      lowStockProducts,
      totalOutstanding,
      defaulters,
      totalSales,
      paymentMethodsSummary,
    ] = await Promise.all([
      saleRepository.sumRevenueByStore(storeId),
      saleRepository.sumRevenueByStore(storeId, effectiveFrom, effectiveTo),
      productRepository.countByStoreId(storeId),
      productRepository.findLowStock(storeId),
      receivableRepository.sumOutstandingByStore(storeId),
      customerRepository.findDefaulters(storeId),
      saleRepository.countByStoreId(storeId),
      saleRepository.sumPaymentsByMethod(storeId, effectiveFrom, effectiveTo),
    ]);

    return {
      storeRevenue,
      monthlyRevenue,
      totalProducts,
      lowStockProducts: lowStockProducts.map((p) => ({
        id: p.id,
        name: p.name,
        stock: p.stock,
        minStock: p.minStock,
      })),
      totalOutstanding,
      defaulters: defaulters.map((d) => ({ id: d.id, name: d.name })),
      totalSales,
      paymentMethodsSummary: paymentMethodsSummary.map((p) => ({
        method: p.method,
        amount: p.amount,
      })),
    };
  },

  async getEmployeeDashboard(storeId: string): Promise<EmployeeDashboardData> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const { default: cashSessionRepo } = await import(
      "@/repositories/cash-session.repository"
    ).then((m) => ({ default: m.cashSessionRepository }));

    const [todayRevenue, openSession] = await Promise.all([
      saleRepository.sumRevenueByStore(storeId, startOfDay),
      cashSessionRepo.findOpenByStoreId(storeId),
    ]);

    // Count today's sales via revenue calculation (approximate)
    const todaySales = todayRevenue > 0 ? 1 : 0; // We'll improve this

    return {
      todaySales,
      todayRevenue,
      openSession: !!openSession,
    };
  },
};
