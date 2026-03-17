import { z } from 'zod';

/**
 * Organization schemas
 */

// Create organization
export const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(50, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

// Update organization
export const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
