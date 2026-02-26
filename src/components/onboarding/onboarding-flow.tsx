/**
 * Fluxo de onboarding: pergunta se é dono ou funcionário e direciona.
 * - Dono: criar loja
 * - Funcionário: orientar a entrar em contato com o dono para ser adicionado
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Store, UserPlus, Building2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/auth/sign-out-button";

interface OnboardingFlowProps {
  userName: string | null;
  userEmail: string;
}

type Step = "choose" | "owner" | "employee";

export function OnboardingFlow({ userName, userEmail }: OnboardingFlowProps) {
  const [step, setStep] = useState<Step>("choose");
  const router = useRouter();

  function handleAlreadyAdded() {
    router.refresh();
    router.push("/stores");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900">
              <Store className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-semibold text-slate-900">PDV SaaS</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          {step === "choose" && (
            <>
              <h1 className="text-xl font-semibold text-slate-900 text-center">
                Bem-vindo(a){userName ? `, ${userName}` : ""}!
              </h1>
              <p className="mt-2 text-sm text-slate-500 text-center mb-8">
                Você ainda não está vinculado a nenhuma loja. Como você vai usar o sistema?
              </p>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setStep("owner")}
                  className="flex w-full items-center gap-4 rounded-xl border-2 border-slate-200 bg-white p-4 text-left transition-all hover:border-blue-500 hover:bg-blue-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="font-medium text-slate-900">Sou dono do comércio</span>
                    <p className="text-sm text-slate-500 mt-0.5">Quero criar minha loja e gerenciar vendas, estoque e equipe.</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setStep("employee")}
                  className="flex w-full items-center gap-4 rounded-xl border-2 border-slate-200 bg-white p-4 text-left transition-all hover:border-blue-500 hover:bg-blue-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <UserPlus className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="font-medium text-slate-900">Sou funcionário / colaborador</span>
                    <p className="text-sm text-slate-500 mt-0.5">Vou operar o PDV de uma loja que já existe.</p>
                  </div>
                </button>
              </div>
            </>
          )}

          {step === "owner" && (
            <>
              <div className="text-center mb-6">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 mb-4">
                  <Building2 className="h-6 w-6" />
                </div>
                <h1 className="text-xl font-semibold text-slate-900">Crie sua loja</h1>
                <p className="mt-2 text-sm text-slate-500">
                  Para começar a usar o PDV, cadastre sua loja. Depois você pode convidar colaboradores.
                </p>
              </div>
              <Link href="/stores/new" className="block">
                <Button size="lg" className="w-full">
                  Criar minha loja
                </Button>
              </Link>
              <button
                type="button"
                onClick={() => setStep("choose")}
                className="mt-4 w-full text-center text-sm text-slate-500 hover:text-slate-700"
              >
                Voltar
              </button>
            </>
          )}

          {step === "employee" && (
            <>
              <div className="text-center mb-6">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 mb-4">
                  <UserPlus className="h-6 w-6" />
                </div>
                <h1 className="text-xl font-semibold text-slate-900">Aguardando vínculo</h1>
                <p className="mt-2 text-sm text-slate-500">
                  Entre em contato com o dono ou o responsável pelo estabelecimento e peça para ser adicionado como colaborador. 
                  Ele precisará do seu e-mail: <strong className="text-slate-700">{userEmail}</strong>
                </p>
                <p className="mt-4 text-sm text-slate-600">
                  Quando você for adicionado à loja, poderá acessar o PDV normalmente.
                </p>
              </div>
              <div className="space-y-3">
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full gap-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
                  onClick={handleAlreadyAdded}
                >
                  <RefreshCw className="h-4 w-4" />
                  Já fui adicionado, atualizar
                </Button>
                <SignOutButton className="w-full justify-center rounded-lg border border-slate-200 py-2.5 hover:bg-slate-50" />
              </div>
              <button
                type="button"
                onClick={() => setStep("choose")}
                className="mt-4 w-full text-center text-sm text-slate-500 hover:text-slate-700"
              >
                Voltar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
