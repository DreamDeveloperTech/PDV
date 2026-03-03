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
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { apiRequest } from "@/hooks/use-fetch";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Search, XCircle, Eye } from "lucide-react";

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
  soldByName: string | null;
  createdAt: string;
  cancelledAt: string | null;
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
  const [canCancelSale, setCanCancelSale] = useState(false);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [saleToCancel, setSaleToCancel] = useState<SaleRow | null>(null);
  const [detailModalSale, setDetailModalSale] = useState<SaleRow | null>(null);
  const [cancelPassword, setCancelPassword] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [setPasswordLoading, setSetPasswordLoading] = useState(false);
  const [setPasswordError, setSetPasswordError] = useState("");
  const [setPasswordSuccess, setSetPasswordSuccess] = useState(false);

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
      setCanCancelSale(Boolean(json.canCancelSale));
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

  function openCancelModal(sale: SaleRow) {
    setSaleToCancel(sale);
    setCancelPassword("");
    setCancelError("");
    setCancelModalOpen(true);
  }

  function closeCancelModal() {
    setCancelModalOpen(false);
    setSaleToCancel(null);
    setCancelPassword("");
    setCancelError("");
    setNewPassword("");
    setConfirmPassword("");
    setSetPasswordError("");
    setSetPasswordSuccess(false);
  }

  async function handleConfirmCancel() {
    if (!saleToCancel || !cancelPassword.trim()) return;
    setCancelLoading(true);
    setCancelError("");
    try {
      await apiRequest(
        `/api/sales/${saleToCancel.id}/cancel?storeId=${storeId}`,
        { method: "POST", body: { password: cancelPassword } }
      );
      closeCancelModal();
      fetchSales();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Erro ao cancelar venda");
    } finally {
      setCancelLoading(false);
    }
  }

  async function handleSetPassword() {
    if (newPassword.length < 6) {
      setSetPasswordError("A senha deve ter no mínimo 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      setSetPasswordError("As senhas não coincidem");
      return;
    }
    setSetPasswordLoading(true);
    setSetPasswordError("");
    setSetPasswordSuccess(false);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setSetPasswordSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
      setCancelError("");
    } catch (err) {
      setSetPasswordError(err instanceof Error ? err.message : "Erro ao cadastrar senha");
    } finally {
      setSetPasswordLoading(false);
    }
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
                <TableHead>Status</TableHead>
                <TableHead className="w-[90px]">Detalhes</TableHead>
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
                    <TableCell>
                      {sale.cancelledAt ? (
                        <Badge variant="default">Cancelada</Badge>
                      ) : (
                        <Badge variant="success">Concluída</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDetailModalSale(sale)}
                        title="Ver itens e vendedor"
                      >
                        <Eye size={14} className="mr-1" />
                        Ver
                      </Button>
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

      <Modal
        isOpen={!!detailModalSale}
        onClose={() => setDetailModalSale(null)}
        title="Detalhes da venda"
      >
        {detailModalSale && (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
              <p>
                <strong>Vendido por:</strong> {detailModalSale.soldByName ?? "—"}
              </p>
              <p>
                <strong>Data:</strong> {formatDateTime(detailModalSale.createdAt)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-gray-500 mb-2">Itens</p>
              <div className="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
                <div className="grid grid-cols-4 gap-2 border-b border-gray-200 px-3 py-2 text-xs font-semibold uppercase text-gray-500">
                  <span className="col-span-2">Produto</span>
                  <span className="text-right">Qtd x Unit.</span>
                  <span className="text-right">Total</span>
                </div>
                <ul className="divide-y divide-gray-200">
                  {detailModalSale.items.map((item, idx) => (
                    <li key={idx} className="grid grid-cols-4 gap-2 px-3 py-2 text-sm">
                      <span className="col-span-2 text-gray-800">{item.productName}</span>
                      <span className="text-right text-gray-600">
                        {item.quantity}x {formatCurrency(item.unitPrice)}
                      </span>
                      <span className="text-right font-medium text-gray-800">
                        {formatCurrency(item.total)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="text-sm text-gray-900 text-right">
              <span className="font-semibold">Total da venda: </span>
              {formatCurrency(detailModalSale.total)}
            </p>
            <div className="flex items-center justify-between gap-3">
              {canCancelSale && !detailModalSale.cancelledAt && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setDetailModalSale(null);
                    openCancelModal(detailModalSale);
                  }}
                  className="flex items-center gap-1"
                >
                  <XCircle size={14} />
                  Cancelar venda
                </Button>
              )}
              <Button variant="secondary" onClick={() => setDetailModalSale(null)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={cancelModalOpen}
        onClose={closeCancelModal}
        title="Cancelar venda"
      >
        <div className="space-y-4">
          {saleToCancel && (
            <p className="text-sm text-gray-600">
              Venda de <strong>{formatCurrency(saleToCancel.total)}</strong>{" "}
              ({formatDateTime(saleToCancel.createdAt)}). O estoque e o valor em dinheiro serão revertidos.
            </p>
          )}
          <Input
            label="Sua senha"
            type="password"
            value={cancelPassword}
            onChange={(e) => setCancelPassword(e.target.value)}
            placeholder="Digite sua senha para confirmar"
            autoComplete="current-password"
          />
          {cancelError && (
            <>
              <p className="text-sm text-red-600">{cancelError}</p>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-3">
                <p className="text-sm font-medium text-amber-800">
                  Não tem senha cadastrada? (ex.: entrou com Google)
                </p>
                <p className="text-sm text-amber-700">
                  Cadastre uma senha abaixo. Depois use-a no campo acima para confirmar o cancelamento.
                </p>
                {setPasswordSuccess && (
                  <p className="text-sm text-green-700 font-medium">Senha cadastrada. Agora digite-a acima e confirme o cancelamento.</p>
                )}
                <Input
                  label="Nova senha"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                  disabled={setPasswordSuccess}
                />
                <Input
                  label="Confirmar senha"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  autoComplete="new-password"
                  disabled={setPasswordSuccess}
                />
                {setPasswordError && (
                  <p className="text-sm text-red-600">{setPasswordError}</p>
                )}
                {!setPasswordSuccess && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleSetPassword}
                    loading={setPasswordLoading}
                    disabled={!newPassword.trim() || !confirmPassword.trim()}
                  >
                    Cadastrar senha
                  </Button>
                )}
              </div>
            </>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={closeCancelModal}>
              Fechar
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmCancel}
              loading={cancelLoading}
              disabled={!cancelPassword.trim()}
            >
              Confirmar cancelamento
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
