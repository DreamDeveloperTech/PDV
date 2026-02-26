/**
 * API routes for Stock Movements.
 * GET: List movements for a store
 * POST: Create a manual stock adjustment (RESTOCK/ADJUSTMENT)
 */
import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/services/auth.service";
import { productService } from "@/services/product.service";
import { stockAdjustmentSchema } from "@/schemas/product.schema";
import { handleApiError } from "@/lib/errors/api-error-handler";
import { ValidationError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");

    if (!storeId) {
      throw new ValidationError("storeId é obrigatório");
    }

    await authService.getStoreUserContext(storeId);

    const page = Number(searchParams.get("page") ?? "1");
    const pageSize = Number(searchParams.get("pageSize") ?? "20");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const from = fromParam ? new Date(fromParam) : undefined;
    const to = toParam ? new Date(toParam) : undefined;

    const result = await productService.getStockMovements(storeId, { page, pageSize, from, to });
    return NextResponse.json({
      data: result.data,
      total: result.total,
      page,
      pageSize,
      totalPages: Math.ceil(result.total / pageSize),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");

    if (!storeId) {
      throw new ValidationError("storeId é obrigatório");
    }

    const context = await authService.getStoreUserContext(storeId);
    authService.requireRole(context, ["MASTER", "OWNER"]);

    const body = await request.json();
    const input = stockAdjustmentSchema.parse(body);
    const operatorName = context.user.name || context.user.email;
    const reason =
      input.reason && input.reason.trim().length > 0
        ? `${input.reason} - por: ${operatorName}`
        : `Ajuste de estoque - por: ${operatorName}`;
    const product = await productService.adjustStock(storeId, {
      ...input,
      reason,
    });

    return NextResponse.json({ data: product });
  } catch (error) {
    return handleApiError(error);
  }
}
