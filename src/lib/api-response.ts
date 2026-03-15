import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Standard API response types
 */
export type ApiResponse<T> = {
  data?: T;
  error?: string;
  message?: string;
};

/**
 * Creates a successful JSON response
 */
export function success<T>(
  data: T,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ data }, { status });
}

/**
 * Creates an error JSON response
 */
export function error(
  message: string,
  status: number = 400
): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Returns 401 Unauthorized response
 */
export function unauthorized(
  message: string = 'Unauthorized'
): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Returns 403 Forbidden response
 */
export function forbidden(
  message: string = 'Forbidden'
): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * Returns 404 Not Found response
 */
export function notFound(
  message: string = 'Not Found'
): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ error: message }, { status: 404 });
}

/**
 * Returns 422 Unprocessable Entity response (for validation errors)
 */
export function validationError(
  message: string = 'Validation Error'
): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ error: message }, { status: 422 });
}

/**
 * Returns 500 Internal Server Error response
 */
export function serverError(
  message: string = 'Internal Server Error'
): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ error: message }, { status: 500 });
}

/**
 * Helper to handle Zod validation errors
 */
export function handleZodError(error: unknown): NextResponse<ApiResponse<never>> {
  if (isZodError(error)) {
    return validationError(error.issues[0]?.message || 'Validation failed');
  }
  return serverError();
}

/**
 * Type guard for ZodError
 */
function isZodError(error: unknown): error is { issues: Array<{ message: string }> } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'issues' in error &&
    Array.isArray((error as { issues?: unknown }).issues)
  );
}

/**
 * Parses JSON body from request with error handling
 */
export async function parseJsonBody<T>(req: NextRequest): Promise<T> {
  try {
    return await req.json();
  } catch {
    throw new Error('Invalid JSON body');
  }
}

/**
 * Paginated response helper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

/**
 * Creates a paginated response
 */
export function paginated<T>(
  data: T[],
  total: number,
  limit: number,
  offset: number
): NextResponse<PaginatedResponse<T>> {
  return NextResponse.json({
    data,
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + data.length < total,
    },
  });
}
