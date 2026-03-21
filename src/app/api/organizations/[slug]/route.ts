import { NextRequest } from 'next/server';
import { requireOrgAccess, requireOrgOwner, handleAuthError } from '@/backend/middleware/auth';
import { success, handleZodError, error, notFound } from '@/backend/utils/api-response';
import { updateOrganizationSchema } from '@/backend/schemas';
import { organizationService } from '@/backend/services';
/**
 * GET /api/organizations/[slug] - Get organization by slug
 * PUT /api/organizations/[slug] - Update organization
 * DELETE /api/organizations/[slug] - Delete organization
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const organization = await organizationService.getOrganizationBySlug(slug);

    if (!organization) {
      return notFound('Organization not found');
    }

    // Check if user is a member
    const auth = await requireOrgAccess(organization.id, 'member');

    // Non-admins see org info but not full member list
    const myMembership = organization.members.find((m) => m.userId === auth.id);
    const isAdmin = myMembership?.role === 'owner' || myMembership?.role === 'admin';

    if (!isAdmin) {
      // Strip member details for non-admin members
      const { members, ...orgPublic } = organization;
      return success({
        ...orgPublic,
        memberCount: members.length,
        _count: organization._count,
      });
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
  _req: NextRequest,
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
    return error('Internal server error', 500);
  }
}
