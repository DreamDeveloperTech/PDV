/**
 * API routes for Customer management.
 */
import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/services/auth.service";
import { customerService } from "@/services/customer.service";
import { createCustomerSchema } from "@/schemas/customer.schema";
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
    const pageSize = Number(searchParams.get("pageSize") ?? "20");

    const result = await customerService.getCustomers(storeId, { search, page, pageSize });
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
    authService.requireRole(context, ["MASTER", "OWNER"]);

    const body = await request.json();
    const input = createCustomerSchema.parse(body);
    const customer = await customerService.createCustomer(storeId, input);

    return NextResponse.json({ data: customer }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
