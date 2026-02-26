/**
 * Edit product page.
 */
"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { apiRequest } from "@/hooks/use-fetch";
import { ArrowLeft } from "lucide-react";

interface ProductResponse {
  id: string;
  name: string;
  description: string | null;
  barcode: string | null;
  sku: string | null;
  cost: number;
  price: number;
  stock: number;
  minStock: number;
  unit: string;
}

export default function EditProductPage({
  params,
}: {
  params: Promise<{ storeId: string; productId: string }>;
}) {
  const { storeId, productId } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    barcode: "",
    sku: "",
    cost: "",
    price: "",
    minStock: "",
    unit: "un",
  });
  const [currentStock, setCurrentStock] = useState<number | null>(null);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  useEffect(() => {
    async function loadProduct() {
      try {
        setInitialLoading(true);
        const response: ProductResponse = await apiRequest(
          `/api/products/${productId}?storeId=${storeId}`,
          { method: "GET" }
        );

        setForm({
          name: response.name,
          description: response.description ?? "",
          barcode: response.barcode ?? "",
          sku: response.sku ?? "",
          cost: String(response.cost ?? 0),
          price: String(response.price ?? 0),
          minStock: String(response.minStock ?? 0),
          unit: response.unit ?? "un",
        });
        setCurrentStock(response.stock);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao carregar produto"
        );
      } finally {
        setInitialLoading(false);
      }
    }

    loadProduct();
  }, [storeId, productId]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const body = {
        name: form.name || undefined,
        description: form.description || undefined,
        barcode: form.barcode || undefined,
        sku: form.sku || undefined,
        cost: form.cost ? Number(form.cost) : undefined,
        price: form.price ? Number(form.price) : undefined,
        minStock: form.minStock ? Number(form.minStock) : undefined,
        unit: form.unit || undefined,
      };

      await apiRequest(`/api/products/${productId}?storeId=${storeId}`, {
        method: "PATCH",
        body,
      });

      router.push(`/stores/${storeId}/products`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao atualizar produto"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <Link
        href={`/stores/${storeId}/products`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={16} /> Voltar
      </Link>

      <Card title="Editar Produto">
        {initialLoading ? (
          <div className="p-4 text-sm text-gray-500">Carregando produto...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <Input
              label="Nome"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              required
            />
            <Input
              label="Descrição"
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Código de Barras"
                value={form.barcode}
                onChange={(e) => updateField("barcode", e.target.value)}
              />
              <Input
                label="SKU"
                value={form.sku}
                onChange={(e) => updateField("sku", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Custo (R$)"
                type="number"
                step="0.01"
                min="0"
                value={form.cost}
                onChange={(e) => updateField("cost", e.target.value)}
              />
              <Input
                label="Preço (R$)"
                type="number"
                step="0.01"
                min="0.01"
                value={form.price}
                onChange={(e) => updateField("price", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Estoque atual"
                value={
                  currentStock !== null ? String(currentStock) : "Carregando..."
                }
                disabled
              />
              <Input
                label="Estoque Mínimo"
                type="number"
                step="0.01"
                min="0"
                value={form.minStock}
                onChange={(e) => updateField("minStock", e.target.value)}
              />
              <Input
                label="Unidade"
                value={form.unit}
                onChange={(e) => updateField("unit", e.target.value)}
              />
            </div>

            <Button type="submit" loading={loading} className="w-full">
              Salvar Alterações
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}

