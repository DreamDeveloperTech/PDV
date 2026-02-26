/**
 * Owner/Master dashboard client with date filters.
 */
"use client";

import { useEffect, useState } from "react";
import { MetricCard } from "@/components/ui/metric-card";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, Package, Users, AlertTriangle, TrendingUp } from "lucide-react";
import type { OwnerDashboardData } from "@/services/dashboard.service";

interface OwnerDashboardClientProps {
  storeId: string;
  initialData: OwnerDashboardData;
}

function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function OwnerDashboardClient({ storeId, initialData }: OwnerDashboardClientProps) {
  const [data, setData] = useState<OwnerDashboardData>(initialData);
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function fetchData(nextFrom?: string, nextTo?: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ storeId });
      if (nextFrom) params.set("from", nextFrom);
      if (nextTo) params.set("to", nextTo);

      const response = await fetch(`/api/dashboard?${params.toString()}`);
      const json = await response.json();
      setData(json.data);
    } finally {
      setLoading(false);
    }
  }

  function handleApplyFilter() {
    fetchData(from || undefined, to || undefined);
  }

  function handleToday() {
    const today = formatDateInput(new Date());
    setFrom(today);
    setTo(today);
    fetchData(today, today);
  }

  function handleCurrentMonth() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const fromStr = formatDateInput(startOfMonth);
    const toStr = formatDateInput(now);
    setFrom(fromStr);
    setTo(toStr);
    fetchData(fromStr, toStr);
  }

  useEffect(() => {
    // Default to current month on first render
    handleCurrentMonth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-xs text-gray-500">
            Filtros por dia ou mês aplicam-se à{" "}
            <span className="font-semibold">Receita no Período</span>.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">De</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Até</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleApplyFilter}
              className="mt-1 inline-flex items-center rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
            >
              {loading ? "Carregando..." : "Aplicar"}
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="mt-1 inline-flex items-center rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={handleCurrentMonth}
              className="mt-1 inline-flex items-center rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
            >
              Mês atual
            </button>
          </div>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Receita Total"
          value={formatCurrency(data.storeRevenue)}
          icon={<DollarSign size={20} />}
        />
        <MetricCard
          title="Receita no Período"
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

