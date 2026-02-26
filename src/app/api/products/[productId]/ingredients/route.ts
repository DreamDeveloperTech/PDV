/**
 * API for product ingredients (recipe/dose).
 * GET: list ingredients
 * PUT: set ingredients (replace all)
 */
import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/services/auth.service";
import { productService } from "@/services/product.service";
import { setProductIngredientsSchema } from "@/schemas/product.schema";
import { handleApiError } from "@/lib/errors/api-error-handler";
import { ValidationError } from "@/lib/errors";

interface RouteContext { params: Promise<{ productId: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { productId } = await context.params;
    const storeId = request.nextUrl.searchParams.get("storeId");
    if (!storeId) throw new ValidationError("storeId é obrigatório");

    await authService.getStoreUserContext(storeId);
    const ingredients = await productService.getProductIngredients(productId);
    return NextResponse.json({ data: ingredients });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { productId } = await context.params;
    const storeId = request.nextUrl.searchParams.get("storeId");
    if (!storeId) throw new ValidationError("storeId é obrigatório");

    const ctx = await authService.getStoreUserContext(storeId);
    authService.requireRole(ctx, ["MASTER", "OWNER"]);

    const body = await request.json();
    const input = setProductIngredientsSchema.parse(body);
    await productService.setProductIngredients(storeId, productId, input.ingredients);
    const ingredients = await productService.getProductIngredients(productId);
    return NextResponse.json({ data: ingredients });
  } catch (error) {
    return handleApiError(error);
  }
}
