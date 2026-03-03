/**
 * Receivables (FIADO) page - view and manage accounts receivable.
 */
"use client";

import { useState, useEffect, useCallback, useMemo, use } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  EmptyState,
} from "@/components/ui/table";
import { apiRequest } from "@/hooks/use-fetch";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { DollarSign, Eye } from "lucide-react";

interface SaleItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Receivable {
  id: string;
  customerId: string;
  amount: number;
  paidAmount: number;
  status: "OPEN" | "PARTIAL" | "PAID" | "CANCELLED";
  description: string | null;
  createdAt: string;
  customer: { name: string };
  sale?: { id: string; soldByName: string | null; items: SaleItem[] } | null;
}

/** Agrupamento por cliente para a lista principal */
interface CustomerGroup {
  customerId: string;
  customerName: string;
  receivables: Receivable[];
  totalOutstanding: number;
}

export default function ReceivablesPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentModal, setPaymentModal] = useState<Receivable | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState("");
  const [saleDetailReceivable, setSaleDetailReceivable] = useState<Receivable | null>(null);
  const [customerDetailGroup, setCustomerDetailGroup] = useState<CustomerGroup | null>(null);

  const fetchReceivables = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        storeId,
        pageSize: "500",
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      const response = await fetch(`/api/receivables?${queryParams}`);
      const json = await response.json();
      setReceivables(json.data ?? []);
    } catch {
      setReceivables([]);
    } finally {
      setLoading(false);
    }
  }, [storeId, statusFilter]);

  /** Agrupa recebíveis por cliente para exibir um card por cliente */
  const groupedByCustomer = useMemo((): CustomerGroup[] => {
    const byId = new Map<string, Receivable[]>();
    for (const r of receivables) {
      const id = r.customerId;
      if (!byId.has(id)) byId.set(id, []);
      byId.get(id)!.push(r);
    }
    return Array.from(byId.entries()).map(([customerId, recs]) => {
      const customerName = recs[0]?.customer?.name ?? "Cliente";
      const totalOutstanding = recs.reduce(
        (sum, r) => (r.status === "OPEN" || r.status === "PARTIAL" ? sum + (r.amount - r.paidAmount) : sum),
        0
      );
      return { customerId, customerName, receivables: recs, totalOutstanding };
    });
  }, [receivables]);

  useEffect(() => {
    fetchReceivables();
  }, [fetchReceivables]);

  async function handlePayment(event: React.FormEvent) {
    event.preventDefault();
    if (!paymentModal) return;
    setPaymentLoading(true);
    setError("");

    try {
      await apiRequest(`/api/receivables?storeId=${storeId}`, {
        body: {
          receivableId: paymentModal.id,
          amount: Number(paymentAmount),
          paymentMethod: "CASH",
        },
      });
      setPaymentModal(null);
      setPaymentAmount("");
      fetchReceivables();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao registrar pagamento");
    } finally {
      setPaymentLoading(false);
    }
  }

  const statusConfig = {
    OPEN: { label: "Em Aberto", variant: "danger" as const },
    PARTIAL: { label: "Parcial", variant: "warning" as const },
    PAID: { label: "Pago", variant: "success" as const },
    CANCELLED: { label: "Cancelado", variant: "default" as const },
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Contas a Receber (Fiado)</h1>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-2">
        {["", "OPEN", "PARTIAL", "PAID", "CANCELLED"].map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? "primary" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter(status)}
          >
            {status === "" ? "Todos" : statusConfig[status as keyof typeof statusConfig].label}
          </Button>
        ))}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Títulos</TableHead>
              <TableHead className="text-right">Total a receber</TableHead>
              <TableHead className="w-[100px]">Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <EmptyState message="Carregando..." />
            ) : groupedByCustomer.length === 0 ? (
              <EmptyState message="Nenhuma conta a receber encontrada" />
            ) : (
              groupedByCustomer.map((group) => (
                <TableRow key={group.customerId}>
                  <TableCell className="font-medium">{group.customerName}</TableCell>
                  <TableCell className="text-right">{group.receivables.length}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(group.totalOutstanding)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCustomerDetailGroup(group)}
                      title="Ver todas as transações do cliente"
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
      </Card>

      {/* Modal: todas as transações do cliente */}
      <Modal
        isOpen={!!customerDetailGroup}
        onClose={() => setCustomerDetailGroup(null)}
        title={customerDetailGroup ? `Fiado — ${customerDetailGroup.customerName}` : ""}
      >
        {customerDetailGroup && (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
              <p><strong>Cliente:</strong> {customerDetailGroup.customerName}</p>
              <p><strong>Total a receber:</strong> {formatCurrency(customerDetailGroup.totalOutstanding)}</p>
              <p><strong>Quantidade de títulos:</strong> {customerDetailGroup.receivables.length}</p>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Pago</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[70px]">Venda</TableHead>
                    <TableHead className="w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerDetailGroup.receivables.map((receivable) => {
                    const remaining = receivable.amount - receivable.paidAmount;
                    return (
                      <TableRow key={receivable.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDateTime(receivable.createdAt)}
                        </TableCell>
                        <TableCell className="text-sm">{receivable.description || "—"}</TableCell>
                        <TableCell className="text-right text-sm">{formatCurrency(receivable.amount)}</TableCell>
                        <TableCell className="text-right text-sm">{formatCurrency(receivable.paidAmount)}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatCurrency(remaining)}</TableCell>
                        <TableCell>
                          <Badge variant={statusConfig[receivable.status].variant}>
                            {statusConfig[receivable.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {receivable.sale ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSaleDetailReceivable(receivable)}
                              title="Ver itens e vendedor"
                            >
                              <Eye size={12} />
                            </Button>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {receivable.status !== "PAID" && receivable.status !== "CANCELLED" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setPaymentModal(receivable);
                                setPaymentAmount(String(remaining));
                              }}
                            >
                              <DollarSign size={12} className="mr-0.5" />
                              Receber
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setCustomerDetailGroup(null)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Sale detail modal (itens + vendedor) */}
      <Modal
        isOpen={!!saleDetailReceivable?.sale}
        onClose={() => setSaleDetailReceivable(null)}
        title="Detalhes da venda (fiado)"
      >
        {saleDetailReceivable?.sale && (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
              <p>
                <strong>Vendido por:</strong> {saleDetailReceivable.sale.soldByName ?? "—"}
              </p>
              <p>
                <strong>Data da venda:</strong> {formatDateTime(saleDetailReceivable.createdAt)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-gray-500 mb-2">
                Itens ({saleDetailReceivable.sale.items.length})
              </p>
              <div className="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
                <div className="grid grid-cols-4 gap-2 border-b border-gray-200 px-3 py-2 text-xs font-semibold uppercase text-gray-500">
                  <span className="col-span-2">Produto</span>
                  <span className="text-right">Qtd x Unit.</span>
                  <span className="text-right">Total</span>
                </div>
                <ul className="divide-y divide-gray-200">
                  {saleDetailReceivable.sale.items.map((item, idx) => (
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
              {formatCurrency(saleDetailReceivable.amount)}
            </p>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setSaleDetailReceivable(null)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={!!paymentModal}
        onClose={() => setPaymentModal(null)}
        title="Registrar Pagamento"
      >
        {paymentModal && (
          <form onSubmit={handlePayment} className="space-y-4">
            {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

            <div className="rounded-lg bg-gray-50 p-3 text-sm">
              <p><strong>Cliente:</strong> {paymentModal.customer.name}</p>
              <p><strong>Valor Total:</strong> {formatCurrency(paymentModal.amount)}</p>
              <p><strong>Já Pago:</strong> {formatCurrency(paymentModal.paidAmount)}</p>
              <p><strong>Saldo:</strong> {formatCurrency(paymentModal.amount - paymentModal.paidAmount)}</p>
            </div>

            <Input
              label="Valor do Pagamento (R$)"
              type="number"
              step="0.01"
              min="0.01"
              max={String(paymentModal.amount - paymentModal.paidAmount)}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              required
            />

            <Button type="submit" loading={paymentLoading} className="w-full">
              Confirmar Pagamento
            </Button>
          </form>
        )}
      </Modal>
    </div>
  );
}
