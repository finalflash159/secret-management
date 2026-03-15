import { z } from 'zod';

/**
 * Folder schemas
 */

// Create folder
export const createFolderSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  envId: z.string().min(1, 'Environment ID is required'),
  parentId: z.string().optional(),
});

export type CreateFolderInput = z.infer<typeof createFolderSchema>;

// Update folder
export const updateFolderSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  parentId: z.string().nullable().optional(),
});

export type UpdateFolderInput = z.infer<typeof updateFolderSchema>;

// List folders query
export const listFoldersQuerySchema = z.object({
  envId: z.string().optional(),
});

export type ListFoldersQuery = z.infer<typeof listFoldersQuerySchema>;
