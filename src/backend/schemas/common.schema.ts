import { z } from 'zod';

/**
 * Common schemas shared across the application
 */

// Pagination parameters
export const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

// ID parameter
export const idParamSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

export type IdParam = z.infer<typeof idParamSchema>;

// Slug parameter
export const slugParamSchema = z.object({
  slug: z.string().min(1, 'Slug is required'),
});

export type SlugParam = z.infer<typeof slugParamSchema>;

// UUID validation
export const uuidSchema = z.string().uuid('Invalid UUID format');

// Boolean string coercion (for query params)
export const booleanSchema = z
  .coerce
  .boolean()
  .default(false);

// ISO Date string
export const isoDateSchema = z.string().datetime().optional();

// JSON object
export const jsonSchema = z.record(z.string(), z.unknown()).optional();

// No content response
export const emptyResponseSchema = z.object({});

export type EmptyResponse = z.infer<typeof emptyResponseSchema>;

// Success response wrapper
export const successResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema,
  });

export type SuccessResponse<T> = {
  data: T;
};
