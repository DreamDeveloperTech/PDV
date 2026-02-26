/**
 * POST /api/cash-sessions/withdraw - Registra sangria (retirada) do caixa.
 */
import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/services/auth.service";
import { cashSessionService } from "@/services/cash-session.service";
import { withdrawCashSessionSchema } from "@/schemas/sale.schema";
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
    const input = withdrawCashSessionSchema.parse(body);
    const withdrawnBy = input.withdrawnUserId ?? context.user.id;

    const withdrawal = await cashSessionService.registerWithdrawal(
      storeId,
      input.sessionId,
      withdrawnBy,
      input.amount,
      input.notes
    );

    return NextResponse.json({ data: withdrawal }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
