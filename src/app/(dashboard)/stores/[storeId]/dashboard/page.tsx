/**
 * Dashboard page - only MASTER and OWNER. Employees are redirected to PDV.
 */
import { redirect } from "next/navigation";
import { authService } from "@/services/auth.service";
import { dashboardService } from "@/services/dashboard.service";
import { OwnerDashboardClient } from "@/components/dashboard/owner-dashboard-client";

interface DashboardPageProps {
  params: Promise<{ storeId: string }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { storeId } = await params;
  const context = await authService.getStoreUserContext(storeId);

  if (context.role === "EMPLOYEE") {
    redirect(`/stores/${storeId}/pos`);
  }

  const data = await dashboardService.getOwnerDashboard(storeId);
  return <OwnerDashboardClient storeId={storeId} initialData={data} />;
}
