/**
 * Receivables (FIADO) page - view and manage accounts receivable.
 */
"use client";

import { useState, useEffect, useCallback, use } from "react";
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
import { DollarSign } from "lucide-react";

interface Receivable {
  id: string;
  amount: number;
  paidAmount: number;
  status: "OPEN" | "PARTIAL" | "PAID";
  description: string | null;
  createdAt: string;
  customer: { name: string };
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

  const fetchReceivables = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        storeId,
        pageSize: "50",
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      const response = await fetch(`/api/receivables?${queryParams}`);
      const json = await response.json();
      setReceivables(json.data);
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, [storeId, statusFilter]);

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
              <TableHead>Data</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead>Saldo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <EmptyState message="Carregando..." />
            ) : receivables.length === 0 ? (
              <EmptyState message="Nenhuma conta a receber encontrada" />
            ) : (
              receivables.map((receivable) => {
                const remaining = receivable.amount - receivable.paidAmount;
                return (
                  <TableRow key={receivable.id}>
                    <TableCell>{formatDateTime(receivable.createdAt)}</TableCell>
                    <TableCell className="font-medium">{receivable.customer.name}</TableCell>
                    <TableCell>{receivable.description || "-"}</TableCell>
                    <TableCell>{formatCurrency(receivable.amount)}</TableCell>
                    <TableCell>{formatCurrency(receivable.paidAmount)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(remaining)}</TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[receivable.status].variant}>
                        {statusConfig[receivable.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {receivable.status !== "PAID" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPaymentModal(receivable);
                            setPaymentAmount(String(remaining));
                          }}
                        >
                          <DollarSign size={14} className="mr-1" /> Receber
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

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
