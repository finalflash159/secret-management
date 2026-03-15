import { z } from 'zod';

/**
 * Environment schemas
 */

// Create environment
export const createEnvironmentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(20, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
});

export type CreateEnvironmentInput = z.infer<typeof createEnvironmentSchema>;
