import { NextRequest } from 'next/server';
import { requireAuth } from '@/backend/middleware/auth';
import { success, handleZodError, error } from '@/backend/utils/api-response';
import { createOrganizationSchema } from '@/backend/schemas';
import { organizationService } from '@/backend/services';

/**
 * GET /api/organizations - List organizations
 * POST /api/organizations - Create a new organization
 */
export async function GET() {
  try {
    const { user } = await requireAuth();

    const organizations = await organizationService.getOrganizations(user.id);
    return success(organizations);
  } catch (err) {
    console.error('Get organizations error:', err);
    const response = handleAuthError(err);
    if (response) return response;
    return error('Internal server error', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth();

    const body = await req.json();
    const data = createOrganizationSchema.parse(body);

    const organization = await organizationService.create(data, user.id);
    return success(organization, 201);
  } catch (err) {
    console.error('Create organization error:', err);
    const response = handleAuthError(err);
    if (response) return response;

    if (err instanceof Error && err.message.includes('already taken')) {
      return error(err.message, 400);
    }
    return handleZodError(err);
  }
}

/**
 * Helper to handle auth errors
 */
function handleAuthError(err: unknown) {
  if (err && typeof err === 'object') {
    const errObj = err as Record<string, unknown>;
    const message = errObj.message;
    if (message === 'Unauthorized') {
      return error('Unauthorized', 401);
    }
    if (errObj.status === 403) {
      return error(String(message), 403);
    }
    if (errObj.status === 404) {
      return error(String(message), 404);
    }
  }
  return null;
}
