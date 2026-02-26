/**
 * API routes for Store management.
 * GET: List stores for current user (MASTER sees all)
 * POST: Create a new store
 */
import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/services/auth.service";
import { storeService } from "@/services/store.service";
import { createStoreSchema } from "@/schemas/store.schema";
import { handleApiError } from "@/lib/errors/api-error-handler";
import { isMasterEmail } from "@/lib/utils";

export async function GET() {
  try {
    const user = await authService.getCurrentUser();

    if (isMasterEmail(user.email)) {
      const stores = await storeService.getAllStores();
      return NextResponse.json({ data: stores });
    }

    const storeUsers = await storeService.getUserStores(user.id);
    const stores = storeUsers.map((su) => ({
      ...su.store,
      role: su.role,
    }));

    return NextResponse.json({ data: stores });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authService.getCurrentUser();
    const body = await request.json();
    const input = createStoreSchema.parse(body);
    const store = await storeService.createStore(user, input);
    return NextResponse.json({ data: store }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
