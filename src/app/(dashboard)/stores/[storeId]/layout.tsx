/**
 * Store layout - wraps all store-scoped pages with sidebar navigation.
 * Validates store access and provides store context.
 */
import { authService } from "@/services/auth.service";
import { storeService } from "@/services/store.service";
import { Sidebar } from "@/components/layout/sidebar";
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
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        storeId={storeId}
        storeName={store.name}
        role={context.role}
        userName={context.user.name || context.user.email}
      />
      <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
        {children}
      </main>
    </div>
  );
}
