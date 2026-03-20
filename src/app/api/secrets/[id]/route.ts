import { NextRequest } from 'next/server';
import { requireProjectAccess } from '@/backend/middleware/auth';
import { success, handleZodError, error, notFound } from '@/backend/utils/api-response';
import { secretService, auditService } from '@/backend/services';

/**
 * GET /api/secrets/[id] - Get a single secret
 * DELETE /api/secrets/[id] - Delete a secret
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const secret = await secretService.getSecretById(id);

    if (!secret) {
      return notFound('Secret not found');
    }

    // Check access to the project
    const { user } = await requireProjectAccess(secret.projectId, 'secret:read');

    // Log the view action
    await auditService.logSecretViewed(id, secret.key, user.id, secret.projectId);

    return success(secret);
  } catch (err) {
    console.error('Get secret error:', err);
    const response = handleAuthError(err);
    if (response) return response;
    return error('Internal server error', 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // First get the secret to check access
    const existingSecret = await secretService.getSecretById(id);
    if (!existingSecret) {
      return notFound('Secret not found');
    }

    // Check delete access
    await requireProjectAccess(existingSecret.projectId, 'secret:delete');

    await secretService.delete(id, existingSecret.projectId);

    return success({ success: true });
  } catch (err) {
    console.error('Delete secret error:', err);
    const response = handleAuthError(err);
    if (response) return response;

    if (err instanceof Error && err.message === 'Secret not found') {
      return notFound();
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
