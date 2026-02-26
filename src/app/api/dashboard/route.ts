/**
 * API route for Dashboard metrics.
 * Returns different data based on user role.
 */
import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/services/auth.service";
import { dashboardService } from "@/services/dashboard.service";
import { handleApiError } from "@/lib/errors/api-error-handler";
import { isMasterEmail } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const from = fromParam ? new Date(fromParam) : undefined;
    const to = toParam ? new Date(toParam) : undefined;
    const user = await authService.getCurrentUser();

    // MASTER dashboard (no storeId needed)
    if (isMasterEmail(user.email) && !storeId) {
      const data = await dashboardService.getMasterDashboard(from, to);
      return NextResponse.json({ data, role: "MASTER" });
    }

    if (!storeId) {
      throw new ValidationError("storeId é obrigatório");
    }

    const context = await authService.getStoreUserContext(storeId);

    if (context.role === "MASTER" || context.role === "OWNER") {
      const data = await dashboardService.getOwnerDashboard(storeId, from, to);
      return NextResponse.json({ data, role: context.role });
    }

    // EMPLOYEE dashboard
    const data = await dashboardService.getEmployeeDashboard(storeId);
    return NextResponse.json({ data, role: "EMPLOYEE" });
  } catch (error) {
    return handleApiError(error);
  }
}
