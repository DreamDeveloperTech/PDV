/**
 * Create new product page.
 */
"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { apiRequest } from "@/hooks/use-fetch";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewProductPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const body = {
        name: form.name,
        description: form.description || undefined,
        barcode: form.barcode || undefined,
        sku: form.sku || undefined,
        cost: Number(form.cost) || 0,
        price: Number(form.price),
        stock: Number(form.stock) || 0,
        minStock: Number(form.minStock) || 0,
        unit: form.unit,
      };

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

          <div className="grid grid-cols-3 gap-4">
            <Input label="Estoque Inicial" type="number" step="0.01" min="0" value={form.stock} onChange={(e) => updateField("stock", e.target.value)} />
            <Input label="Estoque Mínimo" type="number" step="0.01" min="0" value={form.minStock} onChange={(e) => updateField("minStock", e.target.value)} />
            <Input label="Unidade" value={form.unit} onChange={(e) => updateField("unit", e.target.value)} />
          </div>

          <Button type="submit" loading={loading} className="w-full">
            Criar Produto
          </Button>
        </form>
      </Card>
    </div>
  );
}
