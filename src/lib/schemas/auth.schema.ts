import { z } from 'zod';

/**
 * Authentication schemas
 */

// Login credentials
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Registration input
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
  inviteCode: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
