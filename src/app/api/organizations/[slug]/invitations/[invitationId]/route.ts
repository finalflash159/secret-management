import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireOrgAccessBySlug, handleAuthError } from '@/backend/middleware/auth';
import { success, error } from '@/backend/utils/api-response';
import { invitationService } from '@/backend/services';

/**
 * GET /api/organizations/[slug]/invitations/[invitationId] - Get single invitation
 * DELETE /api/organizations/[slug]/invitations/[invitationId] - Revoke invitation
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; invitationId: string }> }
) {
  try {
    const { slug, invitationId } = await params;

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

    const invitation = await invitationService.getById(invitationId);

    if (!invitation || invitation.orgId !== org.id) {
      return error('Invitation not found', 404);
    }

    return success(invitation);
  } catch (err) {
    console.error('Get invitation error:', err);
    const response = handleAuthError(err);
    if (response) return response;
    return error('Internal server error', 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; invitationId: string }> }
) {
  try {
    const { slug, invitationId } = await params;

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

    const invitation = await invitationService.getById(invitationId);

    if (!invitation || invitation.orgId !== org.id) {
      return error('Invitation not found', 404);
    }

    // Revoke the invitation
    const revoked = await invitationService.revoke(invitationId);

    return success(revoked);
  } catch (err) {
    console.error('Revoke invitation error:', err);
    const response = handleAuthError(err);
    if (response) return response;
    return error('Internal server error', 500);
  }
}
