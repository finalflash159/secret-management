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
  inviteCode: z.string().optional(),
});

/**
 * MASTER_SUPER_ADMIN mode:
 * - If MASTER_SUPER_ADMIN_EMAIL is set, only that exact email can register.
 * - MASTER_INVITE_CODE must match, and it is single-use (tracked in DB after first use).
 * - The master user is NOT added to any org automatically — they create their own.
 *
 * Normal mode:
 * - ALLOW_SELF_REGISTRATION=true  → anyone can register freely.
 * - ALLOW_SELF_REGISTRATION=false → must provide a valid DB invite code.
 *   (INVITE_CODES env var fallback is REMOVED — expired/revoked codes must not be accepted)
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
    const masterEmail = process.env.MASTER_SUPER_ADMIN_EMAIL;
    const masterCode = process.env.MASTER_INVITE_CODE;

    // ── MASTER_SUPER_ADMIN mode ────────────────────────────────────────────────
    if (masterEmail) {
      // Only the master email is allowed
      if (validatedData.email.toLowerCase() !== masterEmail.toLowerCase()) {
        return NextResponse.json(
          { error: 'Registration is restricted to authorized administrators only.' },
          { status: 403 }
        );
      }

      // Check master invite code
      if (!masterCode) {
        // If master mode is on but no code configured, block all registration
        return NextResponse.json(
          { error: 'Registration is currently disabled.' },
          { status: 403 }
        );
      }

      if (validatedData.inviteCode !== masterCode) {
        return NextResponse.json(
          { error: 'Invalid master invitation code.' },
          { status: 400 }
        );
      }

      // Check if master code was already used
      const existingUse = await db.invitationUse.findFirst({
        where: { usedByEmail: validatedData.email.toLowerCase() },
      });
      if (existingUse) {
        return NextResponse.json(
          { error: 'This master invitation code has already been used.' },
          { status: 400 }
        );
      }

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

      // Create user
      const hashedPassword = await hashPassword(validatedData.password);
      const user = await db.user.create({
        data: {
          email: validatedData.email.toLowerCase(),
          password: hashedPassword,
          name: validatedData.name,
        },
      });

      // Track master code usage (single-use, no DB invite record)
      await invitationService.markAsUsed(
        null,
        user.id,
        validatedData.email.toLowerCase()
      );

      return NextResponse.json(
        { id: user.id, email: user.email, name: user.name },
        { status: 201 }
      );
    }

    // ── NORMAL mode ──────────────────────────────────────────────────────────
    const allowSelfRegistration = process.env.ALLOW_SELF_REGISTRATION === 'true';

    // If self-registration is off, invite code is mandatory
    if (!allowSelfRegistration && !validatedData.inviteCode) {
      return NextResponse.json(
        { error: 'Registration is by invitation only. Please contact your administrator.' },
        { status: 403 }
      );
    }

    // Validate DB invite code (no fallback to env INVITE_CODES)
    let invitationData: {
      valid: boolean;
      error?: string;
      role?: string;
      invitationId?: string;
      orgId?: string;
    } = { valid: true };

    if (validatedData.inviteCode) {
      const dbValidation = await invitationService.validateForRegistration(
        validatedData.inviteCode,
        validatedData.email
      );
      if (!dbValidation.valid) {
        return NextResponse.json(
          { error: dbValidation.error || 'Invalid invitation code' },
          { status: 400 }
        );
      }
      invitationData = dbValidation;
    }

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

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password);

    // Create user
    const user = await db.user.create({
      data: {
        email: validatedData.email.toLowerCase(),
        password: hashedPassword,
        name: validatedData.name,
      },
    });

    // If registered via DB invitation, add to organization
    if (invitationData.valid && invitationData.invitationId && invitationData.role && invitationData.orgId) {
      await invitationService.markAsUsed(invitationData.invitationId, user.id);
      await db.orgMember.create({
        data: {
          userId: user.id,
          orgId: invitationData.orgId,
          role: invitationData.role as 'admin' | 'member',
          invitationId: invitationData.invitationId,
        },
      });
    }

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
