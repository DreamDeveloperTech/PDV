/**
 * Client component for MASTER to manage all stores (activate/deactivate/delete).
 */
"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface StoreRow {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
}

interface ApiResponse {
  data: StoreRow[];
}

export function MasterStoresClient() {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function fetchStores() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/stores");
      const json: ApiResponse = await response.json();
      setStores(json.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStores();
  }, []);

  async function handleToggleActive(store: StoreRow) {
    setUpdatingId(store.id);
    try {
      await fetch(`/api/admin/stores/${store.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !store.isActive }),
      });
      await fetchStores();
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(store: StoreRow) {
    if (
      !window.confirm(
        `Tem certeza que deseja excluir a loja "${store.name}"?\n\nEssa ação remove todos os dados relacionados (vendas, estoque, fiado, etc.).`
      )
    ) {
      return;
    }

    setUpdatingId(store.id);
    try {
      await fetch(`/api/admin/stores/${store.id}`, {
        method: "DELETE",
      });
      await fetchStores();
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <Card className="mt-10">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Lojas</h2>
          <p className="text-xs text-gray-500">
            Como MASTER você pode ativar/desativar e excluir lojas do sistema.
          </p>
        </div>
      </div>
      <div className="px-4 py-3 overflow-x-auto">
        {loading ? (
          <p className="py-6 text-sm text-gray-500">Carregando lojas...</p>
        ) : stores.length === 0 ? (
          <p className="py-6 text-sm text-gray-500">Nenhuma loja cadastrada.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Nome
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Slug
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {stores.map((store) => (
                <tr key={store.id}>
                  <td className="px-3 py-2 text-gray-900">{store.name}</td>
                  <td className="px-3 py-2 text-gray-500">{store.slug}</td>
                  <td className="px-3 py-2">
                    <Badge variant={store.isActive ? "success" : "danger"}>
                      {store.isActive ? "Ativa" : "Inativa"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => handleToggleActive(store)}
                        disabled={updatingId === store.id}
                      >
                        {store.isActive ? "Desativar" : "Ativar"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(store)}
                        disabled={updatingId === store.id}
                      >
                        Excluir
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}

