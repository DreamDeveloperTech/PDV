/**
 * API routes for a single Customer.
 * GET: Get customer by id
 * PATCH: Update customer (MASTER/OWNER)
 */
import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/services/auth.service";
import { customerService } from "@/services/customer.service";
import { updateCustomerSchema } from "@/schemas/customer.schema";
import { handleApiError } from "@/lib/errors/api-error-handler";
import { ValidationError } from "@/lib/errors";

interface RouteContext {
  params: Promise<{ customerId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { customerId } = await context.params;
    const storeId = request.nextUrl.searchParams.get("storeId");

    if (!storeId) {
      throw new ValidationError("storeId é obrigatório");
    }

    await authService.getStoreUserContext(storeId);
    const customer = await customerService.getCustomerById(customerId);
    if (customer.storeId !== storeId) {
      throw new ValidationError("Cliente não pertence a esta loja");
    }
    return NextResponse.json({ data: customer });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { customerId } = await context.params;
    const storeId = request.nextUrl.searchParams.get("storeId");

    if (!storeId) {
      throw new ValidationError("storeId é obrigatório");
    }

    const contextAuth = await authService.getStoreUserContext(storeId);
    authService.requireRole(contextAuth, ["MASTER", "OWNER"]);

    const body = await request.json();
    const input = updateCustomerSchema.parse(body);
    const customer = await customerService.updateCustomer(storeId, customerId, input);
    return NextResponse.json({ data: customer });
  } catch (error) {
    return handleApiError(error);
  }
}
