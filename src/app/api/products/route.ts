/**
 * API routes for Product management.
 * All operations are scoped to a store via storeId query parameter.
 */
import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/services/auth.service";
import { productService } from "@/services/product.service";
import { createProductSchema } from "@/schemas/product.schema";
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

    const search = searchParams.get("search") ?? undefined;
    const page = Number(searchParams.get("page") ?? "1");
    const all = searchParams.get("all") === "1";
    const pageSize = all ? undefined : Number(searchParams.get("pageSize") ?? "20");
    const forPdv = searchParams.get("forPdv") === "1";

    const result = await productService.getProducts(storeId, {
      search,
      page: all ? 1 : page,
      pageSize,
      forPdv,
      all,
    });
    return NextResponse.json({
      data: result.data,
      total: result.total,
      page: all ? 1 : page,
      pageSize: pageSize ?? result.total,
      totalPages: all ? 1 : Math.ceil(result.total / (pageSize ?? 20)),
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
    const input = createProductSchema.parse(body);
    const operatorName = context.user.name || context.user.email;
    const product = await productService.createProduct(storeId, input, operatorName);

    return NextResponse.json({ data: product }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
