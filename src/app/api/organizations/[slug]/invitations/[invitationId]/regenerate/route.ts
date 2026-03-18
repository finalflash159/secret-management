import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireOrgAccessBySlug, handleAuthError } from '@/backend/middleware/auth';
import { success, error } from '@/backend/utils/api-response';
import { invitationService } from '@/backend/services';

/**
 * POST /api/organizations/[slug]/invitations/[invitationId]/regenerate - Regenerate invitation code
 */
export async function POST(
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

    // Regenerate the code
    const regenerated = await invitationService.regenerate(invitationId);

    return success(regenerated);
  } catch (err) {
    console.error('Regenerate invitation error:', err);
    const response = handleAuthError(err);
    if (response) return response;
    return error('Internal server error', 500);
  }
}
