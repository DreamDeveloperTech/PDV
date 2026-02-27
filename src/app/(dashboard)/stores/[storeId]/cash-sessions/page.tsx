/**
 * Cash sessions history - list of openings and closings.
 */
"use client";

import { useState, useEffect, useCallback, use } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  EmptyState,
} from "@/components/ui/table";
import Link from "next/link";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Banknote, ShieldX } from "lucide-react";

interface CashSessionRow {
  id: string;
  status: "OPEN" | "CLOSED";
  openingAmount: number;
  closingAmount: number | null;
  openedAt: string;
  closedAt: string | null;
  openedByUser?: { id: string; name: string | null; email: string };
  closedByUser?: { id: string; name: string | null; email: string } | null;
}

interface ApiResponse {
  data: CashSessionRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function CashSessionsPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params);
  const [sessions, setSessions] = useState<CashSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setForbidden(false);
    try {
      const queryParams = new URLSearchParams({
        storeId,
        page: String(page),
        pageSize: "20",
      });
      const response = await fetch(`/api/cash-sessions?${queryParams.toString()}`);
      if (response.status === 403) {
        setForbidden(true);
        return;
      }
      const json: ApiResponse = await response.json();
      setSessions(json.data ?? []);
      setTotalPages(json.totalPages ?? 1);
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, [storeId, page]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  if (forbidden) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ShieldX size={48} className="text-amber-500 mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Acesso restrito</h1>
        <p className="text-sm text-gray-600 mb-6 max-w-sm">
          Apenas dono ou gerente podem acessar Fechamentos de Caixa.
        </p>
        <Link href={`/stores/${storeId}/pos`}>
          <Button>Ir para o PDV</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Fechamentos de Caixa</h1>
        <p className="text-sm text-gray-500">
          Histórico de aberturas e fechamentos de caixa desta loja.
        </p>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Abertura</TableHead>
              <TableHead>Fechamento</TableHead>
              <TableHead>Valor abertura</TableHead>
              <TableHead>Valor fechamento</TableHead>
              <TableHead>Aberto por</TableHead>
              <TableHead>Fechado por</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <EmptyState message="Carregando..." />
            ) : sessions?.length === 0 ? (
              <EmptyState message="Nenhum fechamento encontrado" />
            ) : (
              sessions?.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>{formatDateTime(session.openedAt)}</TableCell>
                  <TableCell>
                    {session.closedAt ? formatDateTime(session.closedAt) : "-"}
                  </TableCell>
                  <TableCell>{formatCurrency(session.openingAmount)}</TableCell>
                  <TableCell>
                    {session.closingAmount != null
                      ? formatCurrency(session.closingAmount)
                      : "-"}
                  </TableCell>
                  <TableCell className="text-gray-700">
                    {session.openedByUser
                      ? session.openedByUser.name || session.openedByUser.email
                      : "-"}
                  </TableCell>
                  <TableCell className="text-gray-700">
                    {session.closedByUser
                      ? session.closedByUser.name || session.closedByUser.email
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={session.status === "OPEN" ? "success" : "default"}>
                      {session.status === "OPEN" ? "Aberto" : "Fechado"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </Button>
          <span className="text-sm text-gray-500">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}
