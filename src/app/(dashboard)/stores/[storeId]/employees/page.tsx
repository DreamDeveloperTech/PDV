/**
 * Employees (StoreUser) management page.
 * Allows OWNER/MASTER to list, invite and manage store members.
 */
"use client";

import { useState, useEffect, useCallback, use } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";

type Role = "MASTER" | "OWNER" | "EMPLOYEE";

interface StoreUserMember {
  id: string;
  role: Role;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

interface StoreUsersResponse {
  data: StoreUserMember[];
}

export default function EmployeesPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params);
  const [members, setMembers] = useState<StoreUserMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"OWNER" | "EMPLOYEE">("EMPLOYEE");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({ storeId });
      const response = await fetch(`/api/store-users?${queryParams}`);
      const json: StoreUsersResponse = await response.json();
      setMembers(json.data);
    } catch {
      // Silent error for now
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail) return;

    setInviteLoading(true);
    try {
      const queryParams = new URLSearchParams({ storeId });
      const response = await fetch(`/api/store-users?${queryParams}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      if (response.ok) {
        setInviteEmail("");
        await fetchMembers();
      } else {
        // Optional: could parse and show error message
      }
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleChangeRole(id: string, role: "OWNER" | "EMPLOYEE") {
    setUpdatingId(id);
    try {
      const queryParams = new URLSearchParams({ storeId });
      await fetch(`/api/store-users/${id}?${queryParams}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      await fetchMembers();
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleRemove(id: string) {
    if (!window.confirm("Deseja realmente remover este funcionário da loja?")) {
      return;
    }
    setUpdatingId(id);
    try {
      const queryParams = new URLSearchParams({ storeId });
      await fetch(`/api/store-users/${id}?${queryParams}`, {
        method: "DELETE",
      });
      await fetchMembers();
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Funcionários</h1>
          <p className="text-sm text-gray-500">
            Gerencie quem pode acessar esta loja e seus papéis.
          </p>
        </div>
      </div>

      {/* Invite form */}
      <Card className="mb-6 p-4">
        <form onSubmit={handleInvite} className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail do funcionário</label>
            <Input
              type="email"
              placeholder="funcionario@empresa.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </div>
          <div className="w-full md:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">Papel</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "OWNER" | "EMPLOYEE")}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="EMPLOYEE">Funcionário</option>
              <option value="OWNER">Proprietário</option>
            </select>
          </div>
          <div className="w-full md:w-auto">
            <Button type="submit" loading={inviteLoading} className="w-full md:w-auto">
              Convidar
            </Button>
          </div>
        </form>
        <p className="mt-2 text-xs text-gray-500">
          O funcionário precisa ter realizado login pelo menos uma vez com este e-mail para ser encontrado.
        </p>
      </Card>

      {/* Members table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead className="w-40 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <EmptyState message="Carregando..." />
            ) : members.length === 0 ? (
              <EmptyState message="Nenhum funcionário encontrado" />
            ) : (
              members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.user.name || "-"}</TableCell>
                  <TableCell>{member.user.email}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={member.role === "OWNER" ? "default" : "success"}>
                        {member.role === "MASTER"
                          ? "Master"
                          : member.role === "OWNER"
                            ? "Proprietário"
                            : "Funcionário"}
                      </Badge>
                      {member.role !== "MASTER" && (
                        <select
                          value={member.role === "OWNER" ? "OWNER" : "EMPLOYEE"}
                          onChange={(e) =>
                            handleChangeRole(member.id, e.target.value as "OWNER" | "EMPLOYEE")
                          }
                          disabled={updatingId === member.id}
                          className="block rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="EMPLOYEE">Funcionário</option>
                          <option value="OWNER">Proprietário</option>
                        </select>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {member.role !== "MASTER" && (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => handleRemove(member.id)}
                        loading={updatingId === member.id}
                      >
                        Remover
                      </Button>
                    )}
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

