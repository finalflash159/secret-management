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
  // Accepts ISO datetime strings, date-only strings (YYYY-MM-DD), or unix timestamps
  expiresAt: z.string().optional().refine(
    (val) => {
      if (!val || val === '') return true;
      // Accept ISO datetime (with or without time)
      const isoDate = new Date(val);
      if (!isNaN(isoDate.getTime())) return true;
      // Accept YYYY-MM-DD date
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return true;
      // Accept unix timestamp in seconds or milliseconds
      if (/^\d{10,13}$/.test(val)) return true;
      return false;
    },
    { message: 'Invalid date format. Use YYYY-MM-DD, ISO datetime, or leave empty.' }
  ),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateSecretInput = z.infer<typeof createSecretSchema>;

// Update secret
export const updateSecretSchema = z.object({
  key: z.string().min(1).max(256).optional(),
  value: z.string().min(1).max(50000).optional(), // Increased to support long keys like RSA
  folderId: z.string().optional(),
  expiresAt: z.string().optional().refine(
    (val) => {
      if (!val || val === '' || val === null) return true;
      // Accept null to remove expiration
      // Accept ISO datetime (with or without time)
      const isoDate = new Date(val);
      if (!isNaN(isoDate.getTime())) return true;
      // Accept YYYY-MM-DD date
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return true;
      // Accept unix timestamp in seconds or milliseconds
      if (/^\d{10,13}$/.test(val)) return true;
      return false;
    },
    { message: 'Invalid date format. Use YYYY-MM-DD, ISO datetime, or leave empty to remove.' }
  ),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateSecretInput = z.infer<typeof updateSecretSchema>;

// List secrets query
export const listSecretsQuerySchema = z.object({
  envId: z.string().optional(),
  folderId: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  decrypt: z.coerce.boolean().optional().default(false),
});

export type ListSecretsQuery = z.infer<typeof listSecretsQuerySchema>;
