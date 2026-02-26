/**
 * API routes for Accounts Receivable (FIADO).
 * GET: List receivables for a store
 * POST: Register a payment on a receivable
 */
import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/services/auth.service";
import { receivableService } from "@/services/receivable.service";
import { receivablePaymentSchema } from "@/schemas/receivable.schema";
import { handleApiError } from "@/lib/errors/api-error-handler";
import { ValidationError } from "@/lib/errors";
import type { ReceivableStatus } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");

    if (!storeId) {
      throw new ValidationError("storeId é obrigatório");
    }

    await authService.getStoreUserContext(storeId);

    const status = searchParams.get("status") as ReceivableStatus | null;
    const page = Number(searchParams.get("page") ?? "1");
    const pageSize = Number(searchParams.get("pageSize") ?? "20");

    const result = await receivableService.getReceivables(storeId, {
      status: status ?? undefined,
      page,
      pageSize,
    });

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
    authService.requireRole(context, ["MASTER", "OWNER", "EMPLOYEE"]);

    const body = await request.json();
    const input = receivablePaymentSchema.parse(body);
    const result = await receivableService.registerPayment(input);

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
