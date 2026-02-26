/**
 * Converts domain errors into consistent API JSON responses.
 * Used in all API route handlers for uniform error formatting.
 */
import { NextResponse } from "next/server";
import { AppError, ValidationError } from "./index";
import { logger } from "@/lib/logger";

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

export function handleApiError(error: unknown): NextResponse<ErrorResponse> {
  if (error instanceof ValidationError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      { status: error.statusCode }
    );
  }

  // Unexpected errors - log full detail, return generic message
  logger.error("Unexpected error", {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });

  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Erro interno do servidor",
      },
    },
    { status: 500 }
  );
}
