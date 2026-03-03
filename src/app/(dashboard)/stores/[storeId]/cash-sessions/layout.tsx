/**
 * Restricts cash-sessions (histórico de fechamentos) to MASTER and OWNER only.
 * Employees can close the cash from the PDV but must not access this page.
 */
import { redirect } from "next/navigation";
import { authService } from "@/services/auth.service";

interface CashSessionsLayoutProps {
  children: React.ReactNode;
  params: Promise<{ storeId: string }>;
}

export default async function CashSessionsLayout({
  children,
  params,
}: CashSessionsLayoutProps) {
  const { storeId } = await params;
  const context = await authService.getStoreUserContext(storeId);

  if (context.role === "EMPLOYEE") {
    redirect(`/stores/${storeId}/pos`);
  }

  return <>{children}</>;
}
