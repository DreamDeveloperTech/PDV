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
import { Eye, ShieldX } from "lucide-react";
import { Modal } from "@/components/ui/modal";

interface CashWithdrawalRow {
  id: string;
  amount: number;
  createdAt: string;
  user: { id: string; name: string | null; email: string };
}

interface CashSessionRow {
  id: string;
  status: "OPEN" | "CLOSED";
  openingAmount: number;
  closingAmount: number | null;
  openedAt: string;
  closedAt: string | null;
  openedByUser?: { id: string; name: string | null; email: string };
  closedByUser?: { id: string; name: string | null; email: string } | null;
  withdrawals?: CashWithdrawalRow[];
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
  const [detailSession, setDetailSession] = useState<CashSessionRow | null>(null);

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
          Apenas dono ou gerente podem acessar o histórico de caixa.
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
        <h1 className="text-2xl font-bold text-gray-900">Histórico de Caixa</h1>
        <p className="text-sm text-gray-500">
          Aberturas, fechamentos e sangrias (quem retirou e quanto) por sessão de caixa.
        </p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Abertura</TableHead>
              <TableHead>Fechamento</TableHead>
              <TableHead>Valor abertura</TableHead>
              <TableHead>Valor fechamento</TableHead>
              <TableHead>Aberto por</TableHead>
              <TableHead>Fechado por</TableHead>
              <TableHead className="min-w-[180px] max-w-[260px]">Sangrias</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[72px] text-right">Ações</TableHead>
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
                  <TableCell className="align-top text-sm text-gray-700">
                    {session.withdrawals && session.withdrawals.length > 0 ? (
                      <div className="space-y-1.5 py-1">
                        {session.withdrawals.map((w) => (
                          <div
                            key={w.id}
                            className="border-b border-gray-100 pb-1.5 last:border-0 last:pb-0 text-xs leading-snug"
                          >
                            <div className="text-gray-500">{formatDateTime(w.createdAt)}</div>
                            <div className="font-medium text-gray-800">
                              <span className="text-gray-500 font-normal">Por: </span>
                              {w.user?.name || w.user?.email || "—"}
                            </div>
                            <div className="tabular-nums">{formatCurrency(w.amount)}</div>
                          </div>
                        ))}
                        <div className="pt-1 text-xs font-semibold text-gray-900 border-t border-gray-200">
                          Total:{" "}
                          {formatCurrency(
                            session.withdrawals.reduce((s, w) => s + w.amount, 0)
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={session.status === "OPEN" ? "success" : "default"}>
                      {session.status === "OPEN" ? "Aberto" : "Fechado"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => setDetailSession(session)}
                      title={
                        session.status === "CLOSED"
                          ? "Ver detalhes do fechamento"
                          : "Ver detalhes da sessão em aberto"
                      }
                      aria-label={
                        session.status === "CLOSED"
                          ? "Ver detalhes do fechamento"
                          : "Ver detalhes da sessão em aberto"
                      }
                    >
                      <Eye size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </Card>

      <Modal
        isOpen={!!detailSession}
        onClose={() => setDetailSession(null)}
        title={
          detailSession
            ? detailSession.status === "CLOSED"
              ? "Detalhes do fechamento"
              : "Detalhes da sessão (caixa aberto)"
            : ""
        }
      >
        {detailSession && (
          <div className="space-y-4 text-sm text-gray-700">
            {detailSession.status === "CLOSED" && detailSession.closedAt ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50/80 p-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">
                  Resumo do fechamento
                </p>
                <p>
                  <span className="font-medium text-gray-800">Data / hora:</span>{" "}
                  {formatDateTime(detailSession.closedAt)}
                </p>
                <p>
                  <span className="font-medium text-gray-800">Valor contado no fechamento:</span>{" "}
                  {detailSession.closingAmount != null
                    ? formatCurrency(detailSession.closingAmount)
                    : "—"}
                </p>
                <p>
                  <span className="font-medium text-gray-800">Fechado por:</span>{" "}
                  {detailSession.closedByUser
                    ? detailSession.closedByUser.name || detailSession.closedByUser.email
                    : "—"}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-amber-900 text-sm">
                Esta sessão ainda está <strong>aberta</strong>. Os dados de fechamento aparecerão
                após o encerramento no PDV.
              </div>
            )}

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                Abertura do caixa
              </p>
              <p>
                <span className="font-medium text-gray-800">Data / hora:</span>{" "}
                {formatDateTime(detailSession.openedAt)}
              </p>
              <p>
                <span className="font-medium text-gray-800">Valor de abertura:</span>{" "}
                {formatCurrency(detailSession.openingAmount)}
              </p>
              <p>
                <span className="font-medium text-gray-800">Aberto por:</span>{" "}
                {detailSession.openedByUser
                  ? detailSession.openedByUser.name || detailSession.openedByUser.email
                  : "—"}
              </p>
            </div>

            <div>
              <p className="font-semibold text-gray-900 mb-2">Sangrias nesta sessão</p>
              {detailSession.withdrawals && detailSession.withdrawals.length > 0 ? (
                <ul className="rounded-lg border border-gray-200 divide-y divide-gray-100 max-h-[50vh] overflow-y-auto">
                  {detailSession.withdrawals.map((w) => (
                    <li key={w.id} className="px-3 py-3 space-y-1">
                      <div className="text-xs text-gray-500">{formatDateTime(w.createdAt)}</div>
                      <div>
                        <span className="text-gray-600">Quem retirou: </span>
                        <span className="font-medium text-gray-900">
                          {w.user?.name || w.user?.email || "—"}
                        </span>
                      </div>
                      <div className="font-semibold tabular-nums">{formatCurrency(w.amount)}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm">Nenhuma sangria nesta sessão.</p>
              )}
              {detailSession.withdrawals && detailSession.withdrawals.length > 0 && (
                <p className="mt-2 text-sm font-semibold text-gray-900">
                  Total em sangrias:{" "}
                  {formatCurrency(detailSession.withdrawals.reduce((s, w) => s + w.amount, 0))}
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" type="button" onClick={() => setDetailSession(null)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Modal>

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
