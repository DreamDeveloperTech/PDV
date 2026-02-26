/**
 * Restricts receivables (Fiado) to MASTER and OWNER only.
 * Employees are redirected to PDV.
 */
import { redirect } from "next/navigation";
import { authService } from "@/services/auth.service";

interface ReceivablesLayoutProps {
  children: React.ReactNode;
  params: Promise<{ storeId: string }>;
}

export default async function ReceivablesLayout({ children, params }: ReceivablesLayoutProps) {
  const { storeId } = await params;
  const context = await authService.getStoreUserContext(storeId);

  if (context.role === "EMPLOYEE") {
    redirect(`/stores/${storeId}/pos`);
  }

  return <>{children}</>;
}
