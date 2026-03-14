import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/encryption';
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

    // Verify invite code if provided
    if (validatedData.inviteCode) {
      // For now, we'll check against environment variable
      // In production, this would check against stored invite codes
      const validCodes = (process.env.INVITE_CODES || '').split(',').filter(Boolean);
      if (!validCodes.includes(validatedData.inviteCode)) {
        return NextResponse.json(
          { error: 'Invalid invitation code' },
          { status: 400 }
        );
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
        { error: error.errors[0].message },
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
