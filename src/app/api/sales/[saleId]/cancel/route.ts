/**
 * POST /api/sales/[saleId]/cancel
 * Cancel a sale (MASTER/OWNER only, with password).
 * Reverts stock and cash; cancels receivable if FIADO.
 */
import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/services/auth.service";
import { saleService } from "@/services/sale.service";
import { cancelSaleSchema } from "@/schemas/sale.schema";
import { handleApiError } from "@/lib/errors/api-error-handler";
import { ValidationError } from "@/lib/errors";

interface RouteContext {
  params: Promise<{ saleId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { saleId } = await context.params;
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");

    if (!storeId) {
      throw new ValidationError("storeId é obrigatório");
    }

    const ctx = await authService.getStoreUserContext(storeId);
    authService.requireRole(ctx, ["MASTER", "OWNER"]);

    const body = await request.json();
    const input = cancelSaleSchema.parse(body);
    await authService.verifyPassword(input.password);

    const sale = await saleService.cancelSale(storeId, saleId, ctx.user.id);
    return NextResponse.json({ data: sale });
  } catch (error) {
    return handleApiError(error);
  }
}
