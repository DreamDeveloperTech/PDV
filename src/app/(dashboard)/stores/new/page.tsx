/**
 * Create new store page.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { apiRequest } from "@/hooks/use-fetch";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewStorePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    slug: "",
    document: "",
    phone: "",
    address: "",
  });

  function handleNameChange(value: string) {
    const slug = value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    setForm((prev) => ({ ...prev, name: value, slug }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const store = await apiRequest<{ id: string }>("/api/stores", { body: form });
      router.push(`/stores/${store.id}/dashboard`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar loja");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-lg px-4 py-12">
        <Link
          href="/stores"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft size={16} /> Voltar
        </Link>

        <Card title="Criar Nova Loja">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
            )}

            <Input
              label="Nome da Loja"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              placeholder="Minha Loja"
            />

            <Input
              label="Slug (URL)"
              value={form.slug}
              onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
              required
              placeholder="minha-loja"
            />

            <Input
              label="CNPJ (opcional)"
              value={form.document}
              onChange={(e) => setForm((prev) => ({ ...prev, document: e.target.value }))}
              placeholder="00.000.000/0001-00"
            />

            <Input
              label="Telefone (opcional)"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="(00) 00000-0000"
            />

            <Input
              label="Endereço (opcional)"
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              placeholder="Rua, número, cidade"
            />

            <Button type="submit" loading={loading} className="w-full">
              Criar Loja
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
