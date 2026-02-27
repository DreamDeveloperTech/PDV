/**
 * Customers listing page.
 */
"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  EmptyState,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { Plus, Search, Pencil } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  document: string | null;
  phone: string | null;
  creditLimit: number;
  blockedForCredit: boolean;
}

export default function CustomersPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        storeId,
        pageSize: "50",
        ...(search ? { search } : {}),
      });
      const response = await fetch(`/api/customers?${queryParams}`);
      const json = await response.json();
      setCustomers(json.data);
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, [storeId, search]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <Link href={`/stores/${storeId}/customers/new`}>
          <Button>
            <Plus size={16} className="mr-2" /> Novo Cliente
          </Button>
        </Link>
      </div>

      <div className="mb-4 max-w-sm">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Buscar por nome ou documento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Limite de Crédito</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <EmptyState message="Carregando..." />
            ) : customers.length === 0 ? (
              <EmptyState message="Nenhum cliente encontrado" />
            ) : (
              customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.document || "-"}</TableCell>
                  <TableCell>{customer.phone || "-"}</TableCell>
                  <TableCell>{formatCurrency(customer.creditLimit)}</TableCell>
                  <TableCell>
                    {customer.blockedForCredit ? (
                      <Badge variant="danger">Bloqueado</Badge>
                    ) : (
                      <Badge variant="success">Liberado</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link href={`/stores/${storeId}/customers/${customer.id}/edit`}>
                      <Button variant="secondary" size="sm">
                        <Pencil size={14} className="mr-1" />
                        Editar
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
