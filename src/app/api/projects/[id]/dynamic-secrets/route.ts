import { NextRequest } from 'next/server';
import { requireProjectAccess, handleAuthError } from '@/backend/middleware/auth';
import { success, error } from '@/backend/utils/api-response';
import { dynamicSecretService } from '@/backend/services';

/**
 * GET /api/projects/[id]/dynamic-secrets - List dynamic secrets
 * POST /api/projects/[id]/dynamic-secrets - Create dynamic secret
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    await requireProjectAccess(projectId, 'secret:read');

    const { searchParams } = new URL(req.url);
    const envId = searchParams.get('envId') || undefined;

    const dynamicSecrets = await dynamicSecretService.getByProject(projectId, envId);
    return success(dynamicSecrets);
  } catch (err) {
    console.error('Get dynamic secrets error:', err);
    const response = handleAuthError(err);
    if (response) return response;
    return error('Internal server error', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { user } = await requireProjectAccess(projectId, 'secret:write');

    const body = await req.json();

    // Validate required fields
    if (!body.name || !body.provider || !body.envId || !body.config) {
      return error('Missing required fields: name, provider, envId, config', 400);
    }

    if (!['postgresql', 'mysql', 'mongodb', 'redis'].includes(body.provider)) {
      return error('Invalid provider. Supported: postgresql, mysql, mongodb, redis', 400);
    }

    const dynamicSecret = await dynamicSecretService.create(
      {
        name: body.name,
        provider: body.provider,
        envId: body.envId,
        folderId: body.folderId,
        rotationPeriod: body.rotationPeriod,
        config: body.config,
      },
      user.id,
      projectId
    );

    return success(dynamicSecret, 201);
  } catch (err) {
    console.error('Create dynamic secret error:', err);
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