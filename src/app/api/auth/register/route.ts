import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/encryption';
import { invitationService } from '@/backend/services';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
  inviteCode: z.string().optional(),
});

// Only allow registration with valid invite code
// To create first admin, use the seed script
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = registerSchema.parse(body);

    // Check if self-registration is enabled
    const allowSelfRegistration = process.env.ALLOW_SELF_REGISTRATION === 'true';

    // If no invite code and self-registration is disabled, reject
    if (!allowSelfRegistration && !validatedData.inviteCode) {
      return NextResponse.json(
        { error: 'Registration is by invitation only. Please contact your administrator.' },
        { status: 403 }
      );
    }

    // Validate invite code if provided (from database)
    let invitationData: {
      valid: boolean;
      error?: string;
      role?: string;
      invitationId?: string;
      orgId?: string;
    } = { valid: true };

    if (validatedData.inviteCode) {
      // First check database for invite code
      const dbValidation = await invitationService.validateForRegistration(
        validatedData.inviteCode,
        validatedData.email
      );

      if (!dbValidation.valid) {
        // Fall back to env var check for backward compatibility
        const validCodes = (process.env.INVITE_CODES || '').split(',').filter(Boolean);
        if (!validCodes.includes(validatedData.inviteCode)) {
          return NextResponse.json(
            { error: dbValidation.error || 'Invalid invitation code' },
            { status: 400 }
          );
        }
      } else {
        invitationData = dbValidation;
      }
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: {
        email: validatedData.email,
      },
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
        email: validatedData.email,
        password: hashedPassword,
        name: validatedData.name,
      },
    });

    // If registered via invitation, add to organization
    if (invitationData.valid && invitationData.invitationId && invitationData.role && invitationData.orgId) {
      // Mark invitation as used
      await invitationService.markAsUsed(invitationData.invitationId, user.id);

      // Add user to organization with the role from invitation
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
      {
        id: user.id,
        email: user.email,
        name: user.name,
      },
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
