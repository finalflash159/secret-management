import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireOrgAccessBySlug, handleAuthError } from '@/backend/middleware/auth';
import { success, error } from '@/backend/utils/api-response';
import { invitationService } from '@/backend/services';
import { z } from 'zod';

const createInvitationSchema = z.object({
  role: z.enum(['admin', 'member']).default('member'),
  email: z.string().email().optional().nullable(),
  maxUses: z.number().min(1).max(100).optional().nullable(),
  expiresInDays: z.number().min(1).max(365).optional(),
});

/**
 * GET /api/organizations/[slug]/invitations - List all invitations
 * POST /api/organizations/[slug]/invitations - Create invitation
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Verify organization exists
    const org = await db.organization.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!org) {
      return error('Organization not found', 404);
    }

    // Check access - require admin
    await requireOrgAccessBySlug(slug, 'admin');

    const invitations = await invitationService.getByOrgId(org.id);
    const stats = await invitationService.getStats(org.id);

    return success({
      invitations,
      stats,
    });
  } catch (err) {
    console.error('Get invitations error:', err);
    const response = handleAuthError(err);
    if (response) return response;
    return error('Internal server error', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Verify organization exists
    const org = await db.organization.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!org) {
      return error('Organization not found', 404);
    }

    // Check access - require admin
    const { id: userId } = await requireOrgAccessBySlug(slug, 'admin');

    const body = await req.json();
    const validatedData = createInvitationSchema.parse(body);

    // Calculate expiration date if provided
    let expiresAt: Date | null = null;
    if (validatedData.expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + validatedData.expiresInDays);
    }

    const invitation = await invitationService.create(org.id, userId, {
      role: validatedData.role,
      email: validatedData.email,
      maxUses: validatedData.maxUses,
      expiresAt,
    });

    return success(invitation, 201);
  } catch (err) {
    console.error('Create invitation error:', err);
    const response = handleAuthError(err);
    if (response) return response;

    if (err instanceof z.ZodError) {
      return error(err.issues[0].message, 400);
    }
    return error('Internal server error', 500);
  }
}
