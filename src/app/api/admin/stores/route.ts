/**
 * Admin (MASTER) API to list all stores including inactive.
 */
import { NextResponse } from "next/server";
import { authService } from "@/services/auth.service";
import { storeService } from "@/services/store.service";
import { handleApiError } from "@/lib/errors/api-error-handler";
import { isMasterEmail } from "@/lib/utils";
import { ForbiddenError } from "@/lib/errors";

export async function GET() {
  try {
    const user = await authService.getCurrentUser();
    if (!isMasterEmail(user.email)) {
      throw new ForbiddenError("Apenas o usuário MASTER pode acessar esta rota");
    }

    const stores = await storeService.getAllStoresWithInactive();
    return NextResponse.json({ data: stores });
  } catch (error) {
    return handleApiError(error);
  }
}

