import { NextRequest } from 'next/server';
import { requireOrgAccess, handleAuthError } from '@/backend/middleware/auth';
import { success, error } from '@/backend/utils/api-response';
import { organizationService, integrationService } from '@/backend/services';

/**
 * GET /api/organizations/[slug]/integrations/[integrationId] - Get integration
 * PUT /api/organizations/[slug]/integrations/[integrationId] - Update integration
 * DELETE /api/organizations/[slug]/integrations/[integrationId] - Delete integration
 * POST /api/organizations/[slug]/integrations/[integrationId]/test - Test connection
 * POST /api/organizations/[slug]/integrations/[integrationId]/sync - Sync (placeholder)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; integrationId: string }> }
) {
  try {
    const { slug, integrationId } = await params;

    const organization = await organizationService.getOrganizationBySlug(slug);
    if (!organization) {
      return error('Organization not found', 404);
    }

    await requireOrgAccess(organization.id, 'member');

    const integration = await integrationService.getById(integrationId);
    if (!integration || integration.orgId !== organization.id) {
      return error('Integration not found', 404);
    }

    return success(integration);
  } catch (err) {
    console.error('Get integration error:', err);
    const response = handleAuthError(err);
    if (response) return response;
    return error('Internal server error', 500);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; integrationId: string }> }
) {
  try {
    const { slug, integrationId } = await params;

    const organization = await organizationService.getOrganizationBySlug(slug);
    if (!organization) {
      return error('Organization not found', 404);
    }

    await requireOrgAccess(organization.id, 'admin');

    const existing = await integrationService.getById(integrationId);
    if (!existing || existing.orgId !== organization.id) {
      return error('Integration not found', 404);
    }

    const body = await req.json();
    const updateData: Record<string, unknown> = {};

    if (body.name) updateData.name = body.name;
    if (body.config) updateData.config = body.config;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const updated = await integrationService.update(integrationId, updateData);
    return success(updated);
  } catch (err) {
    console.error('Update integration error:', err);
    const response = handleAuthError(err);
    if (response) return response;
    return error('Internal server error', 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; integrationId: string }> }
) {
  try {
    const { slug, integrationId } = await params;

    const organization = await organizationService.getOrganizationBySlug(slug);
    if (!organization) {
      return error('Organization not found', 404);
    }

    const orgAccess = await requireOrgAccess(organization.id, 'admin');

    const existing = await integrationService.getById(integrationId);
    if (!existing || existing.orgId !== organization.id) {
      return error('Integration not found', 404);
    }

    await integrationService.delete(integrationId, organization.id, orgAccess.id);
    return success({ success: true });
  } catch (err) {
    console.error('Delete integration error:', err);
    const response = handleAuthError(err);
    if (response) return response;
    return error('Internal server error', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; integrationId: string }> }
) {
  try {
    const { slug, integrationId } = await params;
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    const organization = await organizationService.getOrganizationBySlug(slug);
    if (!organization) {
      return error('Organization not found', 404);
    }

    await requireOrgAccess(organization.id, 'admin');

    const existing = await integrationService.getById(integrationId);
    if (!existing || existing.orgId !== organization.id) {
      return error('Integration not found', 404);
    }

    if (action === 'test') {
      const result = await integrationService.testConnection(integrationId);
      return success(result);
    }

    if (action === 'sync') {
      // Placeholder for actual sync implementation
      await integrationService.recordSync(integrationId, 'push', 'pending', 0);
      return success({ message: 'Sync initiated' });
    }

    return error('Invalid action', 400);
  } catch (err) {
    console.error('Integration action error:', err);
    const response = handleAuthError(err);
    if (response) return response;
    return error('Internal server error', 500);
  }
}