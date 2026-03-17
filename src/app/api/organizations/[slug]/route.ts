import { NextRequest } from 'next/server';
import { requireAuth, requireOrgAccess, requireOrgOwner } from '@/backend/middleware/auth';
import { success, handleZodError, error, notFound } from '@/backend/utils/api-response';
import { updateOrganizationSchema } from '@/backend/schemas';
import { organizationService } from '@/backend/services';

/**
 * GET /api/organizations/[slug] - Get organization by slug
 * PUT /api/organizations/[slug] - Update organization
 * DELETE /api/organizations/[slug] - Delete organization
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const organization = await organizationService.getOrganizationBySlug(slug);

    if (!organization) {
      return notFound('Organization not found');
    }

    // Check if user is a member
    const { user } = await requireAuth();
    const isMember = organization.members.some(m => m.userId === user.id);
    if (!isMember) {
      return error('Access denied', 403);
    }

    return success(organization);
  } catch (err) {
    console.error('Get organization error:', err);
    const response = handleAuthError(err);
    if (response) return response;
    return error('Internal server error', 500);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const organization = await organizationService.getOrganizationBySlug(slug);
    if (!organization) {
      return notFound('Organization not found');
    }

    // Check admin access
    await requireOrgAccess(organization.id, 'admin');

    const body = await req.json();
    const data = updateOrganizationSchema.parse(body);

    const updated = await organizationService.update(organization.id, data);
    return success(updated);
  } catch (err) {
    console.error('Update organization error:', err);
    const response = handleAuthError(err);
    if (response) return response;
    return handleZodError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const organization = await organizationService.getOrganizationBySlug(slug);
    if (!organization) {
      return notFound('Organization not found');
    }

    // Check owner access
    await requireOrgOwner(organization.id);

    await organizationService.delete(organization.id);
    return success({ success: true });
  } catch (err) {
    console.error('Delete organization error:', err);
    const response = handleAuthError(err);
    if (response) return response;
    return handleZodError(err);
  }
}

/**
 * Helper to handle auth errors
 */
function handleAuthError(err: unknown) {
  if (err instanceof Error) {
    if (err.message === 'Unauthorized') {
      return error('Unauthorized', 401);
    }
    if (err.message === 'Access denied' || err.message.includes('access required')) {
      return error(err.message, 403);
    }
  }
  return null;
}
