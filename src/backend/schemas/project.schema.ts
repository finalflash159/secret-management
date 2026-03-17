import { z } from 'zod';

/**
 * Project schemas
 */

// Environment definition
export const environmentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric'),
});

export type EnvironmentInput = z.infer<typeof environmentSchema>;

// Create project
export const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(50, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
  orgId: z.string().min(1, 'Organization ID is required'),
  environments: z.array(environmentSchema).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

// Update project
export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

// List projects query
export const listProjectsQuerySchema = z.object({
  orgId: z.string().optional(),
});

export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
