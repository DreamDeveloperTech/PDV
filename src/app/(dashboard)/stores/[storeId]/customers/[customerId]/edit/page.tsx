/**
 * Edit customer page.
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

export default function EditCustomerPage({
  params,
}: {
  params: Promise<{ storeId: string; customerId: string }>;
}) {
  const { storeId, customerId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    document: "",
    phone: "",
    email: "",
    creditLimit: "",
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  useEffect(() => {
    async function loadCustomer() {
      try {
        setInitialLoading(true);
        const customer = await apiRequest<{
          name: string;
          document: string | null;
          phone: string | null;
          email: string | null;
          creditLimit: number;
        }>(`/api/customers/${customerId}?storeId=${storeId}`, { method: "GET" });
        setForm({
          name: customer.name ?? "",
          document: customer.document ?? "",
          phone: customer.phone ?? "",
          email: customer.email ?? "",
          creditLimit: String(customer.creditLimit ?? 0),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar cliente");
      } finally {
        setInitialLoading(false);
      }
    }
    loadCustomer();
  }, [storeId, customerId]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await apiRequest(`/api/customers/${customerId}?storeId=${storeId}`, {
        method: "PATCH",
        body: {
          name: form.name || undefined,
          document: form.document || undefined,
          phone: form.phone || undefined,
          email: form.email || undefined,
          creditLimit: form.creditLimit ? Number(form.creditLimit) : undefined,
        },
      });
      router.push(`/stores/${storeId}/customers`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar cliente");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <Link
        href={`/stores/${storeId}/customers`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={16} /> Voltar
      </Link>

      <Card title="Editar Cliente">
        {initialLoading ? (
          <div className="p-4 text-sm text-gray-500">Carregando cliente...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
            )}

            <Input
              label="Nome"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              required
            />
            <Input
              label="CPF / Documento"
              value={form.document}
              onChange={(e) => updateField("document", e.target.value)}
            />
            <Input
              label="Telefone"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
            />
            <Input
              label="Limite de Crédito (R$)"
              type="number"
              step="0.01"
              min="0"
              value={form.creditLimit}
              onChange={(e) => updateField("creditLimit", e.target.value)}
            />

            <Button type="submit" loading={loading} className="w-full">
              Salvar Alterações
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
