import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/encryption';
import { invitationService } from '@/backend/services';
import { z } from 'zod';
import { checkRateLimit, registerRateLimiter } from '@/backend/middleware/rate-limit';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
  inviteCode: z.string(),
});

/**
 * Registration: all users must register via an organization invite code.
 *
 * Bootstrap admin is created automatically by src/lib/bootstrap.ts on startup.
 * This endpoint only handles org invite code registration.
 */
export async function POST(req: NextRequest) {
  // Rate limit check
  const rateLimit = checkRateLimit(registerRateLimiter, req);
  if (!rateLimit.success) {
    return NextResponse.json(
      {
        error: registerRateLimiter.message,
        retryAfterMs: rateLimit.retryAfterMs,
      },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateLimit.retryAfterMs || 0) / 1000).toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimit.resetAt.toString(),
        },
      }
    );
  }

  try {
    const body = await req.json();
    const validatedData = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: validatedData.email.toLowerCase() },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Validate org invite code
    const dbValidation = await invitationService.validateForRegistration(
      validatedData.inviteCode.toUpperCase(),
      validatedData.email
    );
    if (!dbValidation.valid) {
      return NextResponse.json(
        { error: dbValidation.error || 'Invalid invitation code' },
        { status: 400 }
      );
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(validatedData.password);
    const user = await db.user.create({
      data: {
        email: validatedData.email.toLowerCase(),
        password: hashedPassword,
        name: validatedData.name,
      },
    });

    // Add user to organization
    await invitationService.markAsUsed(dbValidation.invitationId!, user.id);
    await db.orgMember.create({
      data: {
        userId: user.id,
        orgId: dbValidation.orgId!,
        role: dbValidation.role as 'admin' | 'member',
        invitationId: dbValidation.invitationId!,
        invitedBy: dbValidation.createdBy ?? null,
      },
    });

    return NextResponse.json(
      { id: user.id, email: user.email, name: user.name },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
