/**
 * Owner/Master dashboard client with date filters.
 */
"use client";

import { useEffect, useState } from "react";
import { MetricCard } from "@/components/ui/metric-card";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, Package, Users, AlertTriangle, TrendingUp } from "lucide-react";
import type { OwnerDashboardData } from "@/services/dashboard.service";

interface OwnerDashboardClientProps {
  storeId: string;
  initialData: OwnerDashboardData;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Dinheiro",
  CREDIT: "Crédito",
  DEBIT: "Débito",
  PIX: "PIX",
  FIADO: "Fiado",
};

function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function OwnerDashboardClient({ storeId, initialData }: OwnerDashboardClientProps) {
  const [data, setData] = useState<OwnerDashboardData>(initialData);
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showLowStockModal, setShowLowStockModal] = useState(false);

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

  const lowStockPreview = data.lowStockProducts.slice(0, 5);
  const hasMoreLowStock = data.lowStockProducts.length > lowStockPreview.length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header + filtros */}
      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Visão geral da loja
          </p>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-xs text-gray-500">
            Os filtros de data afetam apenas a{" "}
            <span className="font-semibold">Receita no Período</span> e os
            resumos de formas de pagamento.
          </p>
        </div>

        {/* Filtros de data e ações sempre abaixo do texto, em linha apenas entre si */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                De
              </label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-[140px] rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Até
              </label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-[140px] rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleApplyFilter}
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700"
            >
              {loading ? "Carregando..." : "Aplicar"}
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={handleCurrentMonth}
              className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
            >
              Mês atual
            </button>
          </div>
        </div>
      </div>

      {/* Métricas principais */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

      {/* Cards secundários: receita por forma de pagamento, estoque baixo, inadimplentes */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Receita por forma de pagamento */}
        <Card
          title="Receita por forma de pagamento"
          description="Valores recebidos por meio de pagamento no período selecionado."
          className="h-full"
        >
          {data.paymentMethodsSummary.length === 0 ? (
            <p className="text-sm text-gray-500">
              Nenhuma venda no período selecionado.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <div className="grid grid-cols-[1fr_auto] bg-gray-50 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">
                <span>Forma de pagamento</span>
                <span className="text-right">Receita</span>
              </div>
              <ul className="divide-y divide-gray-100 bg-white">
                {data.paymentMethodsSummary.map((item) => (
                  <li
                    key={item.method}
                    className="grid grid-cols-[1fr_auto] items-center px-3 py-1.5 text-sm"
                  >
                    <span className="text-gray-700">
                      {PAYMENT_METHOD_LABELS[item.method] || item.method}
                    </span>
                    <span className="text-right font-semibold text-gray-900">
                      {formatCurrency(item.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* Estoque baixo */}
        <Card
          title="Estoque Baixo"
          description="Produtos simples com estoque atual abaixo ou igual ao estoque mínimo configurado."
          className="h-full"
          action={
            data.lowStockProducts.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowLowStockModal(true)}
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                Ver todos
              </button>
            ) : null
          }
        >
          {data.lowStockProducts.length === 0 ? (
            <p className="text-sm text-gray-500">
              Nenhum produto com estoque baixo.
            </p>
          ) : (
            <div className="space-y-2">
              <ul className="space-y-2">
                {lowStockPreview.map((product) => (
                  <li
                    key={product.id}
                    className="flex items-center justify-between rounded-lg bg-yellow-50 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={16} className="text-yellow-600" />
                      <span className="text-sm font-medium text-gray-900">
                        {product.name}
                      </span>
                    </div>
                    <span className="text-sm text-yellow-700">
                      {product.stock} / {product.minStock}
                    </span>
                  </li>
                ))}
              </ul>
              {hasMoreLowStock && (
                <button
                  type="button"
                  onClick={() => setShowLowStockModal(true)}
                  className="ml-auto block text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Ver mais (
                  {data.lowStockProducts.length - lowStockPreview.length})
                </button>
              )}
            </div>
          )}
        </Card>

        {/* Clientes inadimplentes */}
        <Card
          title="Clientes Inadimplentes"
          description="Clientes bloqueados por excesso de crédito."
          className="h-full"
        >
          {data.defaulters.length === 0 ? (
            <p className="text-sm text-gray-500">
              Nenhum cliente inadimplente no momento.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.defaulters.map((customer) => (
                <li
                  key={customer.id}
                  className="flex items-center gap-2 rounded-lg bg-red-50 p-3"
                >
                  <Users size={16} className="text-red-600" />
                  <span className="text-sm font-medium text-gray-900">
                    {customer.name}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Modal
        isOpen={showLowStockModal}
        onClose={() => setShowLowStockModal(false)}
        title="Produtos com estoque baixo"
        size="lg"
      >
        {data.lowStockProducts.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum produto com estoque baixo.</p>
        ) : (
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {data.lowStockProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between rounded-lg bg-yellow-50 px-4 py-2"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-yellow-600" />
                  <span className="text-sm font-medium text-gray-900">
                    {product.name}
                  </span>
                </div>
                <span className="text-sm text-yellow-700">
                  {product.stock} / {product.minStock}
                </span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

