/**
 * Create new product page.
 * Supports normal product, derived product (e.g. box = N units), and later ingredients on edit.
 */
"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { apiRequest } from "@/hooks/use-fetch";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ProductOption {
  id: string;
  name: string;
}

export default function NewProductPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    barcode: "",
    sku: "",
    cost: "",
    price: "",
    stock: "",
    minStock: "",
    unit: "un",
    baseProductId: "",
    conversionFactor: "",
    notifyLowStock: true,
  });

  useEffect(() => {
    fetch(`/api/products?storeId=${storeId}&pageSize=500`)
      .then((r) => r.json())
      .then((j) => setProducts(j.data ?? []))
      .catch(() => setProducts([]));
  }, [storeId]);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const isDerived = form.baseProductId && form.conversionFactor;
      const body: Record<string, unknown> = {
        name: form.name,
        description: form.description || undefined,
        barcode: form.barcode || undefined,
        sku: form.sku || undefined,
        cost: Number(form.cost) || 0,
        price: Number(form.price),
        stock: isDerived ? 0 : Number(form.stock) || 0,
        minStock: Number(form.minStock) || 0,
        unit: form.unit,
        notifyLowStock: form.notifyLowStock,
      };
      if (isDerived) {
        body.baseProductId = form.baseProductId;
        body.conversionFactor = Number(form.conversionFactor);
      }

      await apiRequest(`/api/products?storeId=${storeId}`, { body });
      router.push(`/stores/${storeId}/products`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar produto");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <Link
        href={`/stores/${storeId}/products`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft size={16} /> Voltar
      </Link>

      <Card title="Novo Produto">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          <Input label="Nome" value={form.name} onChange={(e) => updateField("name", e.target.value)} required />
          <Input label="Descrição" value={form.description} onChange={(e) => updateField("description", e.target.value)} />

          <div className="grid grid-cols-2 gap-4">
            <Input label="Código de Barras" value={form.barcode} onChange={(e) => updateField("barcode", e.target.value)} />
            <Input label="SKU" value={form.sku} onChange={(e) => updateField("sku", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Custo (R$)" type="number" step="0.01" min="0" value={form.cost} onChange={(e) => updateField("cost", e.target.value)} />
            <Input label="Preço (R$)" type="number" step="0.01" min="0.01" value={form.price} onChange={(e) => updateField("price", e.target.value)} required />
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-3">
            <p className="text-sm font-medium text-gray-700">Produto derivado (ex.: caixa = 12 unidades)</p>
            <Select
              label="Produto base (opcional)"
              value={form.baseProductId}
              onChange={(e) => updateField("baseProductId", e.target.value)}
              options={[{ value: "", label: "Não é derivado" }, ...products.map((p) => ({ value: p.id, label: p.name }))]}
              placeholder="Não é derivado"
            />
            {form.baseProductId && (
              <Input
                label="Fator de conversão (1 deste = quantas un. do base?)"
                type="number"
                step="0.01"
                min="0.01"
                value={form.conversionFactor}
                onChange={(e) => updateField("conversionFactor", e.target.value)}
                placeholder="Ex: 12"
              />
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Estoque Inicial"
              type="number"
              step="0.01"
              min="0"
              value={form.stock}
              onChange={(e) => updateField("stock", e.target.value)}
              disabled={!!(form.baseProductId && form.conversionFactor)}
            />
            <Input label="Estoque Mínimo" type="number" step="0.01" min="0" value={form.minStock} onChange={(e) => updateField("minStock", e.target.value)} />
            <Input label="Unidade" value={form.unit} onChange={(e) => updateField("unit", e.target.value)} />
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
            <input
              id="notify-low-stock"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={form.notifyLowStock}
              onChange={(e) => updateField("notifyLowStock", e.target.checked.toString())}
            />
            <label htmlFor="notify-low-stock" className="cursor-pointer text-gray-700">
              Notificar quando o estoque deste produto estiver abaixo do mínimo
            </label>
          </div>

          <Button type="submit" loading={loading} className="w-full">
            Criar Produto
          </Button>
        </form>
      </Card>
    </div>
  );
}
