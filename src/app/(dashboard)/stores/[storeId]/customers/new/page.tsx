/**
 * Create new customer page.
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

export default function NewCustomerPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await apiRequest(`/api/customers?storeId=${storeId}`, {
        body: {
          name: form.name,
          document: form.document || undefined,
          phone: form.phone || undefined,
          email: form.email || undefined,
          creditLimit: Number(form.creditLimit) || 0,
        },
      });
      router.push(`/stores/${storeId}/customers`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar cliente");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <Link
        href={`/stores/${storeId}/customers`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft size={16} /> Voltar
      </Link>

      <Card title="Novo Cliente">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          <Input label="Nome" value={form.name} onChange={(e) => updateField("name", e.target.value)} required />
          <Input label="CPF / Documento" value={form.document} onChange={(e) => updateField("document", e.target.value)} />
          <Input label="Telefone" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} />
          <Input
            label="Limite de Crédito (R$)"
            type="number"
            step="0.01"
            min="0"
            value={form.creditLimit}
            onChange={(e) => updateField("creditLimit", e.target.value)}
          />

          <Button type="submit" loading={loading} className="w-full">
            Criar Cliente
          </Button>
        </form>
      </Card>
    </div>
  );
}
