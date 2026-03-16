/**
 * POST /api/cash-sessions/deposit - Registra reforço (entrada) de dinheiro no caixa atual.
 */
import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/services/auth.service";
import { cashSessionService } from "@/services/cash-session.service";
import { depositCashSessionSchema } from "@/schemas/sale.schema";
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
    const input = depositCashSessionSchema.parse(body);

    const session = await cashSessionService.addCashToSession(
      storeId,
      input.sessionId,
      input.amount,
      input.notes
    );

    return NextResponse.json({ data: session }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

