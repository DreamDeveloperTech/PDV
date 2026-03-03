/**
 * API routes for single Receivable (FIADO) operations.
 * PATCH: update amount/description or cancel a receivable.
 */
import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/services/auth.service";
import { receivableService } from "@/services/receivable.service";
import { updateReceivableSchema } from "@/schemas/receivable.schema";
import { handleApiError } from "@/lib/errors/api-error-handler";
import { ValidationError } from "@/lib/errors";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");

    if (!storeId) {
      throw new ValidationError("storeId é obrigatório");
    }

    const context = await authService.getStoreUserContext(storeId);
    // Apenas MASTER/OWNER podem editar/cancelar fiado.
    authService.requireRole(context, ["MASTER", "OWNER"]);

    const body = await request.json();
    const input = updateReceivableSchema.parse(body);

    const updated = await receivableService.updateReceivable(storeId, id, input);

    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

