/**
 * POST: pagamento único distribuído entre todos os títulos em aberto do cliente (FIFO).
 */
import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/services/auth.service";
import { receivableService } from "@/services/receivable.service";
import { customerBulkPaymentSchema } from "@/schemas/receivable.schema";
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
    authService.requireRole(context, ["MASTER", "OWNER"]);

    const body = await request.json();
    const input = customerBulkPaymentSchema.parse(body);
    const result = await receivableService.registerCustomerBulkPayment(storeId, input);

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
