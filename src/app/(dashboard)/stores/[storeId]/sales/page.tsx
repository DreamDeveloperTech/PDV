/**
 * Sales history - list sales with filters (date, customer, payment method, value range).
 */
"use client";

import { useState, useCallback, useEffect, use } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  EmptyState,
} from "@/components/ui/table";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Search } from "lucide-react";

interface SaleItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface SalePayment {
  method: string;
  amount: number;
}

interface SaleRow {
  id: string;
  total: number;
  discount: number;
  createdAt: string;
  customer: { id: string; name: string } | null;
  items: SaleItem[];
  payments: SalePayment[];
}

interface CustomerOption {
  id: string;
  name: string;
}

interface ProductOption {
  id: string;
  name: string;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Dinheiro",
  CREDIT: "Crédito",
  DEBIT: "Débito",
  PIX: "PIX",
  FIADO: "Fiado",
};

function formatDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function SalesPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [productId, setProductId] = useState("");
  const [minTotal, setMinTotal] = useState("");
  const [maxTotal, setMaxTotal] = useState("");

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch(`/api/customers?storeId=${storeId}&pageSize=500`);
      const json = await res.json();
      setCustomers(json.data ?? []);
    } catch {
      setCustomers([]);
    }
  }, [storeId]);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch(`/api/products?storeId=${storeId}&pageSize=500`);
      const json = await res.json();
      setProducts(json.data ?? []);
    } catch {
      setProducts([]);
    }
  }, [storeId]);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        storeId,
        page: String(page),
        pageSize: "20",
      });
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (customerId) params.set("customerId", customerId);
      if (paymentMethod) params.set("paymentMethod", paymentMethod);
      if (productId) params.set("productId", productId);
      if (minTotal) params.set("minTotal", minTotal);
      if (maxTotal) params.set("maxTotal", maxTotal);

      const response = await fetch(`/api/sales?${params.toString()}`);
      const json = await response.json();
      setSales(json.data ?? []);
      setTotalPages(json.totalPages ?? 1);
      setTotal(json.total ?? 0);
    } catch {
      setSales([]);
    } finally {
      setLoading(false);
    }
  }, [storeId, page, from, to, customerId, paymentMethod, productId, minTotal, maxTotal]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  function handleToday() {
    const today = formatDateInput(new Date());
    setFrom(today);
    setTo(today);
    setPage(1);
  }

  function handleCurrentMonth() {
    const now = new Date();
    setFrom(formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1)));
    setTo(formatDateInput(now));
    setPage(1);
  }

  function handleApplyFilters() {
    setPage(1);
  }

  function paymentsSummary(payments: SalePayment[]): string {
    return payments
      .map((p) => `${PAYMENT_METHOD_LABELS[p.method] || p.method}: ${formatCurrency(p.amount)}`)
      .join(" · ");
  }

  function itemsSummary(items: SaleItem[]): string {
    if (items.length === 0) return "—";
    if (items.length === 1) return `${items[0].productName} (${items[0].quantity}x)`;
    return `${items.length} itens`;
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Histórico de Vendas</h1>
        <p className="text-sm text-gray-500">
          Consulte vendas com filtros por data, cliente, produto, forma de pagamento e valor.
        </p>
      </div>

      {/* Filtros */}
      <Card className="mb-4 p-3 sm:p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
          <Search size={16} />
          Filtros
        </div>
        <div className="grid gap-2 sm:gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="De"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <Input
            label="Até"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <Select
            label="Cliente"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            options={[
              { value: "", label: "Todos" },
              ...customers.map((c) => ({ value: c.id, label: c.name })),
            ]}
            placeholder="Todos"
          />
          <Select
            label="Forma de pagamento"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            options={[
              { value: "", label: "Todas" },
              ...Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({ value, label })),
            ]}
            placeholder="Todas"
          />
          <Select
            label="Produto"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            options={[
              { value: "", label: "Todos" },
              ...products.map((p) => ({ value: p.id, label: p.name })),
            ]}
            placeholder="Todos"
          />
          <Input
            label="Valor mínimo (R$)"
            type="number"
            step="0.01"
            min="0"
            value={minTotal}
            onChange={(e) => setMinTotal(e.target.value)}
            placeholder="0,00"
          />
          <Input
            label="Valor máximo (R$)"
            type="number"
            step="0.01"
            min="0"
            value={maxTotal}
            onChange={(e) => setMaxTotal(e.target.value)}
            placeholder="—"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleToday}>
            Hoje
          </Button>
          <Button variant="secondary" size="sm" onClick={handleCurrentMonth}>
            Mês atual
          </Button>
          <Button size="sm" onClick={handleApplyFilters}>
            Aplicar filtros
          </Button>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data / Hora</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <EmptyState message="Carregando..." />
              ) : sales.length === 0 ? (
                <EmptyState message="Nenhuma venda encontrada com os filtros aplicados." />
              ) : (
                sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="whitespace-nowrap text-gray-700">
                      {formatDateTime(sale.createdAt)}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {sale.customer?.name ?? "Consumidor final"}
                    </TableCell>
                    <TableCell className="max-w-[200px] text-gray-600 text-sm">
                      <div
                        className="truncate"
                        title={sale.items.map((i) => `${i.productName} (${i.quantity}x)`).join(", ")}
                      >
                        {itemsSummary(sale.items)}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[220px] text-gray-600 text-sm">
                      <div className="truncate" title={paymentsSummary(sale.payments)}>
                        {paymentsSummary(sale.payments)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(sale.total)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="border-t border-gray-100 px-4 py-2 text-sm text-gray-500">
          {!loading && sales.length > 0 && (
            <span>
              Total: <strong>{total}</strong> venda(s)
            </span>
          )}
        </div>
      </Card>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </Button>
          <span className="text-sm text-gray-500">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}
