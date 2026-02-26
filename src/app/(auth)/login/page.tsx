/**
 * Login page - Google OAuth via Supabase.
 * Layout profissional com identidade visual clara.
 */
"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Store, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  async function handleGoogleLogin() {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Lado esquerdo: branding + logo (visível em telas médias+) */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between overflow-hidden bg-slate-900 px-12 py-16 text-white">
        {/* Decoração de fundo */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-blue-500/40 blur-3xl" />
          <div className="absolute bottom-1/4 right-0 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
        </div>
        <div className="absolute right-0 top-1/2 h-px w-1/2 bg-gradient-to-l from-white/10 to-transparent" />
        <div className="absolute left-0 bottom-1/3 h-px w-2/3 bg-gradient-to-r from-white/5 to-transparent" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
              <Store className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-semibold tracking-tight">PDV SaaS</span>
          </div>
        </div>

        {/* Logo central */}
        <div className="relative flex flex-1 flex-col items-center justify-center py-8">
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 scale-150 rounded-3xl bg-white/5 blur-2xl" />
              <div className="relative flex h-40 w-40 items-center justify-center rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-sm">
                <Store className="h-20 w-20 text-white drop-shadow-lg" strokeWidth={1.5} />
              </div>
            </div>
            <div className="text-center">
              <span className="text-4xl font-bold tracking-tight text-white">PDV</span>
              <span className="ml-1 text-2xl font-medium text-slate-400">SaaS</span>
            </div>
          </div>
        </div>

        <div className="relative space-y-6">
          <h2 className="text-3xl font-bold leading-tight text-white">
            Controle vendas, estoque e caixa em um só lugar.
          </h2>
          <p className="max-w-sm text-slate-400">
            Sistema de ponto de venda para comércios. Acesse de qualquer dispositivo e gerencie sua loja com segurança.
          </p>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Login seguro com Google</span>
          </div>
        </div>
      </div>

      {/* Lado direito: formulário de login */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          {/* Logo em mobile */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900">
                <Store className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-semibold text-slate-900">PDV SaaS</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="text-center mb-8">
              <h1 className="text-xl font-semibold text-slate-900">
                Entrar na sua conta
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Use sua conta Google para acessar o sistema.
              </p>
            </div>

            <Button
              onClick={handleGoogleLogin}
              loading={loading}
              variant="secondary"
              size="lg"
              className="w-full gap-3 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium"
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continuar com Google
            </Button>

            <p className="mt-6 text-center text-xs text-slate-400">
              Ao continuar, você concorda com os termos de uso do sistema.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
