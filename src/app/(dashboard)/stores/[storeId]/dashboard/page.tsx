/**
 * Dashboard page - shows metrics based on user role.
 */
import { authService } from "@/services/auth.service";
import { dashboardService } from "@/services/dashboard.service";
import { MetricCard } from "@/components/ui/metric-card";
import { formatCurrency } from "@/lib/utils";
import { ShoppingCart, DollarSign } from "lucide-react";
import { OwnerDashboardClient } from "@/components/dashboard/owner-dashboard-client";

interface DashboardPageProps {
  params: Promise<{ storeId: string }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { storeId } = await params;
  const context = await authService.getStoreUserContext(storeId);

  if (context.role === "EMPLOYEE") {
    const data = await dashboardService.getEmployeeDashboard(storeId);
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Painel do Caixa</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            title="Vendas Hoje"
            value={data.todaySales}
            icon={<ShoppingCart size={20} />}
          />
          <MetricCard
            title="Receita Hoje"
            value={formatCurrency(data.todayRevenue)}
            icon={<DollarSign size={20} />}
          />
          <MetricCard
            title="Caixa"
            value={data.openSession ? "Aberto" : "Fechado"}
            icon={<ShoppingCart size={20} />}
            description={data.openSession ? "Sessão ativa" : "Abra o caixa para vender"}
          />
        </div>
      </div>
    );
  }

  // OWNER / MASTER dashboard
  const data = await dashboardService.getOwnerDashboard(storeId);

  return <OwnerDashboardClient storeId={storeId} initialData={data} />;
}
