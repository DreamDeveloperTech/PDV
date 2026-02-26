/**
 * Store layout - wraps all store-scoped pages with sidebar navigation.
 * Validates store access and provides store context.
 */
import { authService } from "@/services/auth.service";
import { storeService } from "@/services/store.service";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { redirect } from "next/navigation";

interface StoreLayoutProps {
  children: React.ReactNode;
  params: Promise<{ storeId: string }>;
}

async function getStoreContext(storeId: string) {
  const context = await authService.getStoreUserContext(storeId);
  const store = await storeService.getStoreById(storeId);
  return { context, store };
}

export default async function StoreLayout({ children, params }: StoreLayoutProps) {
  const { storeId } = await params;

  const result = await getStoreContext(storeId).catch(() => null);

  if (!result) {
    redirect("/stores");
  }

  const { context, store } = result;

  return (
    <div className="flex min-h-screen flex-col overflow-hidden md:h-screen md:flex-row">
      {/* Desktop sidebar */}
      <Sidebar
        storeId={storeId}
        storeName={store.name}
        role={context.role}
        userName={context.user.name || context.user.email}
      />

      {/* Main content + mobile chrome */}
      <main className="flex-1 overflow-y-auto bg-gray-50 pb-16 pt-2 md:pb-0 md:p-6">
        {/* Mobile header */}
        <div className="mb-2 border-b border-gray-200 bg-white px-4 py-3 shadow-sm md:hidden">
          <p className="text-xs text-gray-500">Loja atual</p>
          <h1 className="text-base font-semibold text-gray-900 truncate">{store.name}</h1>
          <p className="text-xs text-gray-400">{context.role}</p>
        </div>

        <div className="px-4 pb-2 md:px-0 md:pb-0">{children}</div>

        {/* Mobile bottom navigation */}
        <BottomNav storeId={storeId} role={context.role} />
      </main>
    </div>
  );
}
