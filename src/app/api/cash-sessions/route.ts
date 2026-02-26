/**
 * API routes for Cash Sessions.
 * GET: Get open session or list history
 * POST: Open a new session
 * PATCH: Close current session
 */
import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/services/auth.service";
import { cashSessionService } from "@/services/cash-session.service";
import { openCashSessionSchema, closeCashSessionSchema } from "@/schemas/sale.schema";
import { handleApiError } from "@/lib/errors/api-error-handler";
import { ValidationError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");
    const action = searchParams.get("action");

    if (!storeId) {
      throw new ValidationError("storeId é obrigatório");
    }

    const context = await authService.getStoreUserContext(storeId);

    if (action === "current") {
      const session = await cashSessionService.getOpenSession(storeId);
      const data = session
        ? {
            ...session,
            currentUserName: context.user.name || context.user.email,
            currentUserId: context.user.id,
          }
        : null;
      return NextResponse.json({ data });
    }

    const page = Number(searchParams.get("page") ?? "1");
    const pageSize = Number(searchParams.get("pageSize") ?? "20");
    const result = await cashSessionService.getSessionHistory(storeId, { page, pageSize });

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
    const input = openCashSessionSchema.parse(body);
    const result = await cashSessionService.openSession(
      storeId,
      context.user.id,
      input.openingAmount,
      input.notes
    );

    return NextResponse.json({
      data: { ...result.session, alreadyOpen: result.alreadyOpen },
    }, { status: result.alreadyOpen ? 200 : 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");
    const sessionId = searchParams.get("sessionId");

    if (!storeId || !sessionId) {
      throw new ValidationError("storeId e sessionId são obrigatórios");
    }

    const context = await authService.getStoreUserContext(storeId);
    authService.requireRole(context, ["MASTER", "OWNER", "EMPLOYEE"]);

    const body = await request.json();
    const input = closeCashSessionSchema.parse(body);
    const session = await cashSessionService.closeSession(
      sessionId,
      context.user.id,
      input.closingAmount,
      input.notes
    );

    return NextResponse.json({ data: session });
  } catch (error) {
    return handleApiError(error);
  }
}
