/**
 * Stock movements page - view history and make adjustments.
 */
"use client";

import { useState, useEffect, useCallback, use } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
import { formatDateTime } from "@/lib/utils";
import { Plus } from "lucide-react";

interface Movement {
  id: string;
  type: "SALE" | "RESTOCK" | "ADJUSTMENT";
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string | null;
  createdAt: string;
  product: { name: string };
}

interface Product {
  id: string;
  name: string;
  stock: number;
}

export default function StockPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [form, setForm] = useState({
    productId: "",
    quantity: "",
    type: "RESTOCK" as "RESTOCK" | "ADJUSTMENT",
    reason: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ storeId });
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const [movRes, prodRes] = await Promise.all([
        fetch(`/api/stock-movements?${params.toString()}`),
        fetch(`/api/products?storeId=${storeId}&pageSize=100`),
      ]);
      const movJson = await movRes.json();
      const prodJson = await prodRes.json();
      setMovements(movJson.data);
      setProducts(prodJson.data);
    } catch {
      // Silent error
    } finally {
      setLoading(false);
    }
  }, [storeId, from, to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormLoading(true);
    setError("");

    try {
      await apiRequest(`/api/stock-movements?storeId=${storeId}`, {
        body: {
          productId: form.productId,
          quantity: Number(form.quantity),
          type: form.type,
          reason: form.reason || undefined,
        },
      });
      setModalOpen(false);
      setForm({ productId: "", quantity: "", type: "RESTOCK", reason: "" });
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao ajustar estoque");
    } finally {
      setFormLoading(false);
    }
  }

  const typeLabels: Record<string, { label: string; variant: "success" | "info" | "warning" }> = {
    SALE: { label: "Venda", variant: "info" },
    RESTOCK: { label: "Reposição", variant: "success" },
    ADJUSTMENT: { label: "Ajuste", variant: "warning" },
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Movimentações de Estoque</h1>
          <p className="text-xs text-gray-500">Filtre por dia ou período para analisar saídas e entradas.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">De</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Até</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                const today = new Date().toISOString().slice(0, 10);
                setFrom(today);
                setTo(today);
              }}
            >
              Hoje
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                const now = new Date();
                const start = new Date(now.getFullYear(), now.getMonth(), 1);
                setFrom(start.toISOString().slice(0, 10));
                setTo(now.toISOString().slice(0, 10));
              }}
            >
              Mês atual
            </Button>
            <Button type="button" size="sm" onClick={() => setModalOpen(true)}>
              <Plus size={16} className="mr-2" /> Ajustar Estoque
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Quantidade</TableHead>
              <TableHead>Estoque Anterior</TableHead>
              <TableHead>Novo Estoque</TableHead>
              <TableHead>Motivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <EmptyState message="Carregando..." />
            ) : movements.length === 0 ? (
              <EmptyState message="Nenhuma movimentação encontrada" />
            ) : (
              movements.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell>{formatDateTime(movement.createdAt)}</TableCell>
                  <TableCell className="font-medium">{movement.product.name}</TableCell>
                  <TableCell>
                    <Badge variant={typeLabels[movement.type].variant}>
                      {typeLabels[movement.type].label}
                    </Badge>
                  </TableCell>
                  <TableCell className={movement.quantity > 0 ? "text-green-600" : "text-red-600"}>
                    {movement.quantity > 0 ? "+" : ""}{movement.quantity}
                  </TableCell>
                  <TableCell>{movement.previousStock}</TableCell>
                  <TableCell>{movement.newStock}</TableCell>
                  <TableCell>{movement.reason || "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Adjustment Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Ajustar Estoque">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

          <Select
            label="Produto"
            value={form.productId}
            onChange={(e) => setForm((prev) => ({ ...prev, productId: e.target.value }))}
            options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.stock})` }))}
            placeholder="Selecione um produto"
            required
          />

          <Select
            label="Tipo"
            value={form.type}
            onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as "RESTOCK" | "ADJUSTMENT" }))}
            options={[
              { value: "RESTOCK", label: "Reposição (entrada)" },
              { value: "ADJUSTMENT", label: "Ajuste (pode ser negativo)" },
            ]}
          />

          <Input
            label="Quantidade"
            type="number"
            step="0.01"
            value={form.quantity}
            onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
            required
          />

          <Input
            label="Motivo (opcional)"
            value={form.reason}
            onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
          />

          <Button type="submit" loading={formLoading} className="w-full">
            Confirmar Ajuste
          </Button>
        </form>
      </Modal>
    </div>
  );
}
