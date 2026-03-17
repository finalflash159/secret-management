import { NextRequest } from 'next/server';
import { requireProjectAccess } from '@/backend/middleware/auth';
import { success, handleZodError, error } from '@/backend/utils/api-response';
import { createSecretSchema, listSecretsQuerySchema } from '@/backend/schemas';
import { secretService, auditService } from '@/backend/services';

/**
 * GET /api/projects/[id]/secrets - List secrets in a project
 * POST /api/projects/[id]/secrets - Create a new secret
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    await requireProjectAccess(projectId, 'secret:read');

    const { searchParams } = new URL(req.url);
    const query = listSecretsQuerySchema.parse({
      envId: searchParams.get('envId') || undefined,
      folderId: searchParams.get('folderId') || undefined,
    });

    const secrets = await secretService.getSecrets(projectId, query);
    return success(secrets);
  } catch (err) {
    console.error('Get secrets error:', err);
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
    const data = createSecretSchema.parse(body);

    const secret = await secretService.create(data, user.id, projectId);

    // Log the creation
    await auditService.logSecretCreated(secret.id, secret.key, user.id, projectId);

    return success(secret, 201);
  } catch (err) {
    console.error('Create secret error:', err);
    const response = handleAuthError(err);
    if (response) return response;

    if (err instanceof Error) {
      if (err.message.includes('already exists') || err.message === 'Invalid folder') {
        return error(err.message, 400);
      }
    }
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
    if (err.message === 'Access denied' || err.message === 'Insufficient permissions') {
      return error(err.message, 403);
    }
  }
  return null;
}
