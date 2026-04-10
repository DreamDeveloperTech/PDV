/**
 * Edit product page.
 * Supports derived product (base + factor) and ingredients (doses/recipe).
 */
"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { apiRequest } from "@/hooks/use-fetch";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

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
  baseProductId?: string | null;
  conversionFactor?: number | null;
  notifyLowStock: boolean;
}

interface ProductOption {
  id: string;
  name: string;
}

interface IngredientRow {
  ingredientProductId: string;
  quantityPerUnit: string;
  ingredientName?: string;
}

interface IngredientResponse {
  ingredientProductId: string;
  quantityPerUnit: number;
  ingredient: { id: string; name: string };
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
    baseProductId: "",
    conversionFactor: "",
    notifyLowStock: true,
  });
  const [currentStock, setCurrentStock] = useState<number | null>(null);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [ingredientsLoading, setIngredientsLoading] = useState(false);

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
          baseProductId: response.baseProductId ?? "",
          conversionFactor: response.conversionFactor != null ? String(response.conversionFactor) : "",
          notifyLowStock: response.notifyLowStock ?? true,
        });
        setCurrentStock(response.stock);

        const [prodRes, ingRes] = await Promise.all([
          fetch(`/api/products?storeId=${storeId}&pageSize=500`),
          fetch(`/api/products/${productId}/ingredients?storeId=${storeId}`),
        ]);
        const prodJson = await prodRes.json();
        setProducts(prodJson.data ?? []);
        const ingJson = await ingRes.json();
        const ingData: IngredientResponse[] = ingJson.data ?? [];
        setIngredients(
          ingData.map((i) => ({
            ingredientProductId: i.ingredientProductId,
            quantityPerUnit: String(i.quantityPerUnit),
            ingredientName: i.ingredient?.name,
          }))
        );
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
      const isDerived = Boolean(form.baseProductId && form.conversionFactor);
      const body: Record<string, unknown> = {
        name: form.name || undefined,
        description: form.description || undefined,
        barcode: form.barcode || undefined,
        sku: form.sku || undefined,
        cost: form.cost ? Number(form.cost) : undefined,
        price: form.price ? Number(form.price) : undefined,
        minStock: form.minStock ? Number(form.minStock) : undefined,
        unit: form.unit || undefined,
        notifyLowStock: form.notifyLowStock,
      };
      if (isDerived) {
        body.baseProductId = form.baseProductId;
        body.conversionFactor = Number(form.conversionFactor);
      } else {
        body.baseProductId = null;
        body.conversionFactor = null;
      }

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

  const baseProductOptions = products.filter((p) => p.id !== productId);
  const ingredientProductOptions = products.filter((p) => p.id !== productId);

  function addIngredientRow() {
    setIngredients((prev) => [
      ...prev,
      { ingredientProductId: "", quantityPerUnit: "", ingredientName: undefined },
    ]);
  }

  function removeIngredientRow(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }

  function updateIngredientRow(
    index: number,
    field: "ingredientProductId" | "quantityPerUnit",
    value: string
  ) {
    setIngredients((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === "ingredientProductId") {
        const product = products.find((p) => p.id === value);
        next[index].ingredientName = product?.name;
      }
      return next;
    });
  }

  async function handleSaveIngredients() {
    setIngredientsLoading(true);
    setError("");
    try {
      const payload = ingredients
        .filter((r) => r.ingredientProductId && r.quantityPerUnit)
        .map((r) => ({
          ingredientProductId: r.ingredientProductId,
          quantityPerUnit: Number(r.quantityPerUnit),
        }));
      await apiRequest(`/api/products/${productId}/ingredients?storeId=${storeId}`, {
        method: "PUT",
        body: { ingredients: payload },
      });
      setIngredients(
        payload.map((p) => ({
          ingredientProductId: p.ingredientProductId,
          quantityPerUnit: String(p.quantityPerUnit),
          ingredientName: products.find((x) => x.id === p.ingredientProductId)?.name,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar ingredientes");
    } finally {
      setIngredientsLoading(false);
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

            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
              <input
                id="notify-low-stock"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={form.notifyLowStock}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notifyLowStock: e.target.checked }))
                }
              />
              <label htmlFor="notify-low-stock" className="cursor-pointer text-gray-700">
                Notificar quando o estoque deste produto estiver abaixo do mínimo
              </label>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-3">
              <p className="text-sm font-medium text-gray-700">
                Produto derivado (ex.: caixa = 12 unidades)
              </p>
              <Select
                label="Produto base (opcional)"
                value={form.baseProductId}
                onChange={(e) => updateField("baseProductId", e.target.value)}
                options={[
                  { value: "", label: "Não é derivado" },
                  ...baseProductOptions.map((p) => ({ value: p.id, label: p.name })),
                ]}
                placeholder="Não é derivado"
              />
              <Input
                label="Fator de conversão (unidades por 1 deste produto)"
                type="number"
                step="0.01"
                min="0.01"
                value={form.conversionFactor}
                onChange={(e) => updateField("conversionFactor", e.target.value)}
                disabled={!form.baseProductId}
                placeholder="Ex.: 12"
              />
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-3">
              <p className="text-sm font-medium text-gray-700">
                Ingredientes / Receita (ex.: dose = gelo + bebida; quantidade por unidade)
              </p>
              {ingredients.map((row, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1 min-w-0">
                    <Select
                      label={index === 0 ? "Produto" : ""}
                      value={row.ingredientProductId}
                      onChange={(e) =>
                        updateIngredientRow(index, "ingredientProductId", e.target.value)
                      }
                      options={[
                        { value: "", label: "Selecione..." },
                        ...ingredientProductOptions.map((p) => ({ value: p.id, label: p.name })),
                      ]}
                    />
                  </div>
                  <div className="w-32">
                    <Input
                      label={index === 0 ? "Qtd. por unidade" : ""}
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={row.quantityPerUnit}
                      onChange={(e) =>
                        updateIngredientRow(index, "quantityPerUnit", e.target.value)
                      }
                      placeholder="Ex.: 0.083"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => removeIngredientRow(index)}
                    aria-label="Remover ingrediente"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={addIngredientRow}>
                  <Plus size={16} className="mr-1" />
                  Adicionar ingrediente
                </Button>
                {ingredients.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveIngredients}
                    loading={ingredientsLoading}
                  >
                    Salvar ingredientes
                  </Button>
                )}
              </div>
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

