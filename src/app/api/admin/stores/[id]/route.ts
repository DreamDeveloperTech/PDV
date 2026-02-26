/**
 * Admin (MASTER) API to manage a single store (activate/deactivate/delete).
 */
import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/services/auth.service";
import { storeService } from "@/services/store.service";
import { handleApiError } from "@/lib/errors/api-error-handler";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { isMasterEmail } from "@/lib/utils";

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function ensureMaster() {
  const user = await authService.getCurrentUser();
  if (!isMasterEmail(user.email)) {
    throw new ForbiddenError("Apenas o usuário MASTER pode gerenciar lojas");
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await ensureMaster();
    const { id } = await params;

    const body = await request.json();
    if (typeof body.isActive !== "boolean") {
      throw new ValidationError("Campo isActive (boolean) é obrigatório");
    }

    const store = await storeService.setStoreActive(id, body.isActive);
    return NextResponse.json({ data: store });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    await ensureMaster();
    const { id } = await params;

    await storeService.deleteStore(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

