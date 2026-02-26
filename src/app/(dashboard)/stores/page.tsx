/**
 * Store listing page - shows stores the user has access to.
 * If user has no stores, redirects to onboarding.
 */
import { redirect } from "next/navigation";
import { authService } from "@/services/auth.service";
import { storeService } from "@/services/store.service";
import { isMasterEmail } from "@/lib/utils";
import Link from "next/link";
import { Store, Plus, Shield } from "lucide-react";

export default async function StoresPage() {
  const user = await authService.getCurrentUser();
  const isMaster = isMasterEmail(user.email);

  const storeUsers = await storeService.getUserStores(user.id);

  // If user has no stores and is not master, redirect to onboarding
  if (storeUsers.length === 0 && !isMaster) {
    redirect("/onboarding");
  }

  // If master, also load all stores
  const allStores = isMaster ? await storeService.getAllStores() : [];
  const stores = isMaster
    ? allStores.map((s) => ({ store: s, role: "MASTER" as const }))
    : storeUsers.map((su) => ({ store: su.store, role: su.role }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Minhas Lojas</h1>
            <p className="text-sm text-gray-500 mt-1">
              Olá, {user.name || user.email}
              {isMaster && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                  <Shield size={12} /> MASTER
                </span>
              )}
            </p>
          </div>
          <Link
            href="/stores/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Nova Loja
          </Link>
        </div>

        {/* Store Grid */}
        {stores.length === 0 ? (
          <div className="text-center py-16">
            <Store className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-gray-500">Nenhuma loja encontrada</p>
            <Link
              href="/stores/new"
              className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              <Plus size={16} /> Criar sua primeira loja
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map(({ store, role }) => (
              <Link
                key={store.id}
                href={`/stores/${store.id}/dashboard`}
                className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100">
                    <Store size={20} />
                  </div>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {role}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900 group-hover:text-blue-600">
                  {store.name}
                </h3>
                <p className="text-sm text-gray-500 truncate">{store.slug}</p>
                {store.address && (
                  <p className="mt-1 text-xs text-gray-400 truncate">{store.address}</p>
                )}
              </Link>
            ))}
          </div>
        )}

        {/* Master admin link */}
        {isMaster && (
          <div className="mt-8 text-center">
            <Link
              href="/admin"
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              Painel Administrativo Master
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
