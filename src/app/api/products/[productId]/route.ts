import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/services/auth.service";
import { productService } from "@/services/product.service";
import { updateProductSchema } from "@/schemas/product.schema";
import { ValidationError } from "@/lib/errors";
import { handleApiError } from "@/lib/errors/api-error-handler";

export async function GET(
  request: NextRequest,
  routeContext: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await routeContext.params;
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");

    if (!storeId) {
      throw new ValidationError("storeId é obrigatório");
    }

    await authService.getStoreUserContext(storeId);

    const product = await productService.getProductById(productId);

    if (!product || product.storeId !== storeId) {
      throw new ValidationError("Produto não encontrado para esta loja");
    }

    return NextResponse.json({ data: product });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  routeContext: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await routeContext.params;
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");

    if (!storeId) {
      throw new ValidationError("storeId é obrigatório");
    }

    const context = await authService.getStoreUserContext(storeId);
    authService.requireRole(context, ["MASTER", "OWNER"]);

    const body = await request.json();
    const input = updateProductSchema.parse(body);

    // Não permitir alteração direta de estoque por aqui para manter rastreabilidade.
    const { stock: _ignoredStock, ...rest } = input;

    const existing = await productService.getProductById(productId);
    if (!existing || existing.storeId !== storeId) {
      throw new ValidationError("Produto não encontrado para esta loja");
    }

    const updated = await productService.updateProduct(productId, rest);

    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

