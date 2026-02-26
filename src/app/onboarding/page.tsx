/**
 * Onboarding page - shown when user has no stores linked.
 */
import Link from "next/link";
import { authService } from "@/services/auth.service";
import { Store, Plus } from "lucide-react";

export default async function OnboardingPage() {
  const user = await authService.getCurrentUser();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl text-center">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600">
            <Store className="h-8 w-8 text-white" />
          </div>
        </div>

        <h1 className="mt-6 text-2xl font-bold text-gray-900">Bem-vindo ao PDV SaaS!</h1>
        <p className="mt-2 text-gray-500">
          Olá, {user.name || user.email}! Você ainda não está vinculado a nenhuma loja.
        </p>

        <div className="mt-8 space-y-4">
          <Link
            href="/stores/new"
            className="flex items-center justify-center gap-2 w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            Criar Minha Loja
          </Link>

          <p className="text-xs text-gray-400">
            Ou peça ao proprietário de uma loja para adicioná-lo como colaborador.
          </p>
        </div>
      </div>
    </div>
  );
}
