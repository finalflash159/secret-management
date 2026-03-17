import { z } from 'zod';

/**
 * Secret schemas
 */

// Create secret
export const createSecretSchema = z.object({
  key: z.string().min(1, 'Key is required').max(256, 'Key too long'),
  value: z.string().min(1, 'Value is required').max(50000), // Increased to support long keys like RSA
  envId: z.string().min(1, 'Environment ID is required'),
  folderId: z.string().optional(),
  expiresAt: z.string().datetime().optional(), // ISO date string
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateSecretInput = z.infer<typeof createSecretSchema>;

// Update secret
export const updateSecretSchema = z.object({
  key: z.string().min(1).max(256).optional(),
  value: z.string().min(1).max(50000).optional(), // Increased to support long keys like RSA
  folderId: z.string().optional(),
  expiresAt: z.string().datetime().nullable().optional(), // null to remove expiration
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateSecretInput = z.infer<typeof updateSecretSchema>;

// List secrets query
export const listSecretsQuerySchema = z.object({
  envId: z.string().optional(),
  folderId: z.string().optional(),
});

export type ListSecretsQuery = z.infer<typeof listSecretsQuerySchema>;
