/**
 * Master admin dashboard - shows global metrics across all stores.
 */
import { authService } from "@/services/auth.service";
import { dashboardService } from "@/services/dashboard.service";
import { isMasterEmail } from "@/lib/utils";
import { redirect } from "next/navigation";
import { MetricCard } from "@/components/ui/metric-card";
import { formatCurrency } from "@/lib/utils";
import { Store, DollarSign, TrendingUp, Receipt } from "lucide-react";
import Link from "next/link";

export default async function AdminPage() {
  const user = await authService.getCurrentUser();

  if (!isMasterEmail(user.email)) {
    redirect("/stores");
  }

  const data = await dashboardService.getMasterDashboard();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Painel Master</h1>
            <p className="text-sm text-gray-500">Visão global do sistema</p>
          </div>
          <Link
            href="/stores"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Minhas Lojas
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total de Lojas"
            value={data.totalStores}
            icon={<Store size={20} />}
          />
          <MetricCard
            title="Receita Global"
            value={formatCurrency(data.globalRevenue)}
            icon={<DollarSign size={20} />}
          />
          <MetricCard
            title="Receita Mensal"
            value={formatCurrency(data.monthlyRevenue)}
            icon={<TrendingUp size={20} />}
          />
          <MetricCard
            title="Total a Receber"
            value={formatCurrency(data.globalOutstanding)}
            icon={<Receipt size={20} />}
            trend={data.globalOutstanding > 0 ? "down" : "neutral"}
          />
        </div>
      </div>
    </div>
  );
}
