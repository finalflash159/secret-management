import { z } from 'zod';

/**
 * Member schemas
 */

// Add member to project
export const addMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  roleId: z.string().min(1, 'Role ID is required'),
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;

// Update member role
export const updateMemberSchema = z.object({
  roleId: z.string().min(1, 'Role ID is required'),
});

export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
