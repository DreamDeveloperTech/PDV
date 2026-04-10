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
import { DollarSign, Eye, Pencil, XCircle } from "lucide-react";

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
  const [editReceivable, setEditReceivable] = useState<Receivable | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [cancelReceivable, setCancelReceivable] = useState<Receivable | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [bulkPayGroup, setBulkPayGroup] = useState<CustomerGroup | null>(null);
  const [bulkPaymentAmount, setBulkPaymentAmount] = useState("");
  const [bulkPaymentLoading, setBulkPaymentLoading] = useState(false);
  const [bulkPaymentError, setBulkPaymentError] = useState("");

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

  async function handleEditReceivableSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!editReceivable) return;
    setEditLoading(true);
    setEditError("");

    try {
      await apiRequest(`/api/receivables/${editReceivable.id}?storeId=${storeId}`, {
        method: "PATCH",
        body: {
          amount: Number(editAmount),
          description: editDescription || undefined,
        },
      });
      setEditReceivable(null);
      setEditAmount("");
      setEditDescription("");
      await fetchReceivables();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Erro ao atualizar título de fiado");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleBulkPayment(event: React.FormEvent) {
    event.preventDefault();
    if (!bulkPayGroup) return;
    const total = bulkPayGroup.totalOutstanding;
    const amount = Number(bulkPaymentAmount);
    if (!Number.isFinite(amount) || amount < 0.01) {
      setBulkPaymentError("Informe um valor válido");
      return;
    }
    if (amount - total > 0.01) {
      setBulkPaymentError(`O valor não pode ser maior que o total em aberto (${formatCurrency(total)})`);
      return;
    }

    setBulkPaymentLoading(true);
    setBulkPaymentError("");
    try {
      await apiRequest(`/api/receivables/customer-payment?storeId=${storeId}`, {
        body: {
          customerId: bulkPayGroup.customerId,
          amount,
          paymentMethod: "CASH",
        },
      });
      setBulkPayGroup(null);
      setBulkPaymentAmount("");
      setCustomerDetailGroup(null);
      await fetchReceivables();
    } catch (err) {
      setBulkPaymentError(
        err instanceof Error ? err.message : "Erro ao registrar pagamento em lote"
      );
    } finally {
      setBulkPaymentLoading(false);
    }
  }

  async function handleCancelReceivableConfirm() {
    if (!cancelReceivable) return;
    setCancelLoading(true);
    setCancelError("");
    try {
      await apiRequest(`/api/receivables/${cancelReceivable.id}?storeId=${storeId}`, {
        method: "PATCH",
        body: { status: "CANCELLED" },
      });
      setCancelReceivable(null);
      await fetchReceivables();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Erro ao cancelar título de fiado");
    } finally {
      setCancelLoading(false);
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
              <TableHead className="text-right w-[200px]">Ações</TableHead>
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
                  <TableCell className="text-right">
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCustomerDetailGroup(group)}
                        title="Ver todas as transações do cliente"
                      >
                        <Eye size={14} className="mr-1" />
                        Ver
                      </Button>
                      {group.totalOutstanding > 0 && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setBulkPayGroup(group);
                            setBulkPaymentAmount(
                              String(Math.round(group.totalOutstanding * 100) / 100)
                            );
                            setBulkPaymentError("");
                          }}
                          title="Registrar um pagamento quitando um ou todos os títulos"
                        >
                          <DollarSign size={14} className="mr-1" />
                          Pagar
                        </Button>
                      )}
                    </div>
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
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm space-y-2">
              <p><strong>Cliente:</strong> {customerDetailGroup.customerName}</p>
              <p><strong>Total a receber:</strong> {formatCurrency(customerDetailGroup.totalOutstanding)}</p>
              <p><strong>Quantidade de títulos:</strong> {customerDetailGroup.receivables.length}</p>
              {customerDetailGroup.totalOutstanding > 0 && (
                <Button
                  type="button"
                  size="sm"
                  className="mt-1"
                  onClick={() => {
                    setBulkPayGroup(customerDetailGroup);
                    setBulkPaymentAmount(
                      String(Math.round(customerDetailGroup.totalOutstanding * 100) / 100)
                    );
                    setBulkPaymentError("");
                  }}
                >
                  <DollarSign size={14} className="mr-1" />
                  Pagar valor total (quita títulos mais antigos primeiro)
                </Button>
              )}
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data / descrição</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerDetailGroup.receivables.map((receivable) => {
                    const remaining = receivable.amount - receivable.paidAmount;
                    return (
                      <TableRow key={receivable.id}>
                        <TableCell className="text-sm">
                          <div className="text-gray-700">
                            {formatDateTime(receivable.createdAt)}
                          </div>
                          <div className="text-xs text-gray-500 truncate max-w-[260px]">
                            {receivable.description || "Sem descrição"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {formatCurrency(remaining)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConfig[receivable.status].variant}>
                            {statusConfig[receivable.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            {receivable.sale && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSaleDetailReceivable(receivable)}
                                title="Ver itens e vendedor"
                              >
                                <Eye size={12} />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditReceivable(receivable);
                                setEditAmount(String(receivable.amount));
                                setEditDescription(receivable.description ?? "");
                              }}
                              title="Editar título"
                            >
                              <Pencil size={12} />
                            </Button>
                            {receivable.status !== "PAID" && receivable.status !== "CANCELLED" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setPaymentModal(receivable);
                                    setPaymentAmount(String(remaining));
                                  }}
                                  title="Registrar pagamento"
                                >
                                  <DollarSign size={12} className="mr-0.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setCancelReceivable(receivable)}
                                  title="Cancelar título"
                                >
                                  <XCircle size={12} className="text-red-600" />
                                </Button>
                              </>
                            )}
                          </div>
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
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditReceivable(saleDetailReceivable);
                    setEditAmount(String(saleDetailReceivable.amount));
                    setEditDescription(saleDetailReceivable.description ?? "");
                    setSaleDetailReceivable(null);
                  }}
                  title="Editar título"
                >
                  <Pencil size={14} className="mr-1" />
                  Editar
                </Button>
                {saleDetailReceivable.status !== "PAID" &&
                  saleDetailReceivable.status !== "CANCELLED" && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const remaining =
                            saleDetailReceivable.amount - saleDetailReceivable.paidAmount;
                          setPaymentModal(saleDetailReceivable);
                          setPaymentAmount(String(remaining));
                          setSaleDetailReceivable(null);
                        }}
                        title="Registrar pagamento"
                      >
                        <DollarSign size={14} className="mr-1" />
                        Receber
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCancelReceivable(saleDetailReceivable);
                          setSaleDetailReceivable(null);
                        }}
                        title="Cancelar título"
                      >
                        <XCircle size={14} className="text-red-600 mr-1" />
                        Cancelar
                      </Button>
                    </>
                  )}
              </div>
              <Button variant="secondary" onClick={() => setSaleDetailReceivable(null)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit receivable modal */}
      <Modal
        isOpen={!!editReceivable}
        onClose={() => {
          setEditReceivable(null);
          setEditError("");
        }}
        title="Editar título de fiado"
      >
        {editReceivable && (
          <form onSubmit={handleEditReceivableSubmit} className="space-y-4">
            {editError && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{editError}</div>
            )}
            <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
              <p>
                <strong>Cliente:</strong> {editReceivable.customer.name}
              </p>
              <p>
                <strong>Data:</strong> {formatDateTime(editReceivable.createdAt)}
              </p>
            </div>
            <Input
              label="Valor do título (R$)"
              type="number"
              step="0.01"
              min="0.01"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              required
            />
            <Input
              label="Descrição"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Opcional"
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditReceivable(null);
                  setEditError("");
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={editLoading}>
                Salvar alterações
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Cancel receivable confirm modal */}
      <Modal
        isOpen={!!cancelReceivable}
        onClose={() => {
          setCancelReceivable(null);
          setCancelError("");
        }}
        title="Cancelar título de fiado"
      >
        {cancelReceivable && (
          <div className="space-y-4 text-sm text-gray-700">
            {cancelError && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{cancelError}</div>
            )}
            <p>
              Tem certeza que deseja cancelar este título de fiado do cliente{" "}
              <strong>{cancelReceivable.customer.name}</strong>?
            </p>
            <p>
              <strong>Valor:</strong> {formatCurrency(cancelReceivable.amount)}{" "}
              <span className="text-xs text-gray-500">
                (não registra pagamento, apenas remove do saldo em aberto)
              </span>
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  setCancelReceivable(null);
                  setCancelError("");
                }}
              >
                Fechar
              </Button>
              <Button
                variant="danger"
                type="button"
                onClick={handleCancelReceivableConfirm}
                loading={cancelLoading}
              >
                Confirmar cancelamento
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Pagamento em lote por cliente */}
      <Modal
        isOpen={!!bulkPayGroup}
        onClose={() => {
          setBulkPayGroup(null);
          setBulkPaymentError("");
        }}
        title="Quitar fiado (vários títulos)"
      >
        {bulkPayGroup && (
          <form onSubmit={handleBulkPayment} className="space-y-4">
            {bulkPaymentError && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{bulkPaymentError}</div>
            )}
            <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700 space-y-1">
              <p>
                <strong>Cliente:</strong> {bulkPayGroup.customerName}
              </p>
              <p>
                <strong>Total em aberto:</strong> {formatCurrency(bulkPayGroup.totalOutstanding)}
              </p>
              <p className="text-xs text-gray-500 pt-1">
                O valor será aplicado automaticamente nos títulos em aberto, do mais antigo ao mais
                novo. Você pode informar um valor menor para pagamento parcial.
              </p>
            </div>
            <Input
              label="Valor do pagamento (R$)"
              type="number"
              step="0.01"
              min="0.01"
              max={String(bulkPayGroup.totalOutstanding)}
              value={bulkPaymentAmount}
              onChange={(e) => setBulkPaymentAmount(e.target.value)}
              required
            />
            <Button type="submit" loading={bulkPaymentLoading} className="w-full">
              Confirmar pagamento
            </Button>
          </form>
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
