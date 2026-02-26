/**
 * Dashboard page - shows metrics based on user role.
 */
import { authService } from "@/services/auth.service";
import { dashboardService } from "@/services/dashboard.service";
import { MetricCard } from "@/components/ui/metric-card";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  DollarSign,
  Package,
  Users,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";

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

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Metrics grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Receita Total"
          value={formatCurrency(data.storeRevenue)}
          icon={<DollarSign size={20} />}
        />
        <MetricCard
          title="Receita Mensal"
          value={formatCurrency(data.monthlyRevenue)}
          icon={<TrendingUp size={20} />}
        />
        <MetricCard
          title="Total de Produtos"
          value={data.totalProducts}
          icon={<Package size={20} />}
        />
        <MetricCard
          title="Total a Receber"
          value={formatCurrency(data.totalOutstanding)}
          icon={<DollarSign size={20} />}
          trend={data.totalOutstanding > 0 ? "down" : "neutral"}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Low stock alert */}
        <Card title="Estoque Baixo" description="Produtos abaixo do estoque mínimo">
          {data.lowStockProducts.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum produto com estoque baixo</p>
          ) : (
            <ul className="space-y-2">
              {data.lowStockProducts.map((product) => (
                <li
                  key={product.id}
                  className="flex items-center justify-between rounded-lg bg-yellow-50 p-3"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-yellow-600" />
                    <span className="text-sm font-medium text-gray-900">{product.name}</span>
                  </div>
                  <span className="text-sm text-yellow-700">
                    {product.stock} / {product.minStock}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Defaulters */}
        <Card title="Clientes Inadimplentes" description="Clientes bloqueados por excesso de crédito">
          {data.defaulters.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum cliente inadimplente</p>
          ) : (
            <ul className="space-y-2">
              {data.defaulters.map((customer) => (
                <li
                  key={customer.id}
                  className="flex items-center gap-2 rounded-lg bg-red-50 p-3"
                >
                  <Users size={16} className="text-red-600" />
                  <span className="text-sm font-medium text-gray-900">{customer.name}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
