import { NextRequest } from 'next/server';
import { requireProjectAccess, handleAuthError } from '@/backend/middleware/auth';
import { success, handleZodError, error } from '@/backend/utils/api-response';
import { createSecretSchema, listSecretsQuerySchema } from '@/backend/schemas';
import { secretService } from '@/backend/services';

/**
 * GET /api/projects/[id]/secrets - List secrets in a project
 * POST /api/projects/[id]/secrets - Create a new secret
 *
 * Query params:
 * - envId: Filter by environment
 * - folderId: Filter by folder
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50, max: 100)
 * - decrypt: Set to 'true' to decrypt values (default: false for performance)
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
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      decrypt: searchParams.get('decrypt') || undefined,
    });

    const result = await secretService.getSecrets(projectId, query);
    return success(result);
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