/**
 * API routes for Sales (PDV).
 * GET: List sales with filters (history)
 * POST: Create a new sale
 */
import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/services/auth.service";
import { saleService } from "@/services/sale.service";
import { createSaleSchema } from "@/schemas/sale.schema";
import { handleApiError } from "@/lib/errors/api-error-handler";
import { ValidationError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");
    if (!storeId) {
      throw new ValidationError("storeId é obrigatório");
    }

    const context = await authService.getStoreUserContext(storeId);

    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;
    const customerId = searchParams.get("customerId") ?? undefined;
    const paymentMethod = searchParams.get("paymentMethod") ?? undefined;
    const productId = searchParams.get("productId") ?? undefined;
    const minTotal = searchParams.get("minTotal");
    const maxTotal = searchParams.get("maxTotal");
    const page = Number(searchParams.get("page") ?? "1");
    const pageSize = Number(searchParams.get("pageSize") ?? "20");

    const result = await saleService.getSalesHistory(storeId, {
      from,
      to,
      customerId: customerId || undefined,
      paymentMethod: paymentMethod || undefined,
      productId: productId || undefined,
      minTotal: minTotal != null && minTotal !== "" ? Number(minTotal) : undefined,
      maxTotal: maxTotal != null && maxTotal !== "" ? Number(maxTotal) : undefined,
      page,
      pageSize,
    });

    const canCancelSale = ["MASTER", "OWNER"].includes(context.role);
    return NextResponse.json({
      data: result.data,
      total: result.total,
      page,
      pageSize,
      totalPages: Math.ceil(result.total / pageSize),
      canCancelSale,
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
    authService.requireRole(context, ["MASTER", "OWNER", "EMPLOYEE"]);

    const body = await request.json();
    const input = createSaleSchema.parse(body);

    const sellerName = context.user.name || context.user.email;
    const sale = await saleService.createSale(storeId, input, sellerName);

    return NextResponse.json({ data: sale }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
