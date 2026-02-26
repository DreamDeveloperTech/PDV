/**
 * API routes for Sales (PDV).
 * POST: Create a new sale
 */
import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/services/auth.service";
import { saleService } from "@/services/sale.service";
import { createSaleSchema } from "@/schemas/sale.schema";
import { handleApiError } from "@/lib/errors/api-error-handler";
import { ValidationError } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");

    if (!storeId) {
      throw new ValidationError("storeId é obrigatório");
    }

    const context = await authService.getStoreUserContext(storeId);
    authService.requireRole(context, ["MASTER", "OWNER", "EMPLOYEE"]);

    const body = await request.json();
    const input = createSaleSchema.parse(body);
    const sale = await saleService.createSale(storeId, input);

    return NextResponse.json({ data: sale }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
