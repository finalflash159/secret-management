import { NextRequest } from 'next/server';
import { requireOrgAccess } from '@/backend/middleware/auth';
import { success, error } from '@/backend/utils/api-response';
import { organizationService, integrationService } from '@/backend/services';

/**
 * GET /api/organizations/[slug]/integrations - List integrations
 * POST /api/organizations/[slug]/integrations - Create integration
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const organization = await organizationService.getOrganizationBySlug(slug);
    if (!organization) {
      return error('Organization not found', 404);
    }

    // Check access
    await requireOrgAccess(organization.id, 'member');

    const integrations = await integrationService.getByOrgId(organization.id);
    return success(integrations);
  } catch (err) {
    console.error('Get integrations error:', err);
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

    const organization = await organizationService.getOrganizationBySlug(slug);
    if (!organization) {
      return error('Organization not found', 404);
    }

    // Check admin access
    const orgAccess = await requireOrgAccess(organization.id, 'admin');

    const body = await req.json();

    if (!body.type || !body.name) {
      return error('Missing required fields: type, name', 400);
    }

    const validTypes = ['github', 'aws', 'gcp', 'azure', 'slack'];
    if (!validTypes.includes(body.type)) {
      return error(`Invalid type. Valid: ${validTypes.join(', ')}`, 400);
    }

    const integration = await integrationService.create(organization.id, orgAccess.id, {
      type: body.type,
      name: body.name,
      config: body.config || {},
    });

    return success(integration, 201);
  } catch (err) {
    console.error('Create integration error:', err);
    const response = handleAuthError(err);
    if (response) return response;

    if (err instanceof Error) {
      if (err.message.includes('already exists')) {
        return error(err.message, 400);
      }
    }
    return error('Internal server error', 500);
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
