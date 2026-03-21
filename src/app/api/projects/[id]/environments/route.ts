import { NextRequest } from 'next/server';
import { requireProjectAccess, requireProjectAdmin, handleAuthError } from '@/backend/middleware/auth';
import { success, handleZodError, error } from '@/backend/utils/api-response';
import { createEnvironmentSchema } from '@/backend/schemas';
import { environmentService } from '@/backend/services';

/**
 * GET /api/projects/[id]/environments - List environments
 * POST /api/projects/[id]/environments - Create environment
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    await requireProjectAccess(projectId, 'secret:read');

    const environments = await environmentService.getEnvironments(projectId);
    return success(environments);
  } catch (err) {
    console.error('Get environments error:', err);
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
    const { user } = await requireProjectAdmin(projectId);

    const body = await req.json();
    const data = createEnvironmentSchema.parse(body);

    const environment = await environmentService.create(data, projectId, user.id);
    return success(environment, 201);
  } catch (err) {
    console.error('Create environment error:', err);
    const response = handleAuthError(err);
    if (response) return response;

    if (err instanceof Error && err.message.includes('already exists')) {
      return error(err.message, 400);
    }
    return handleZodError(err);
  }
}

/**
 * DELETE /api/projects/[id]/environments/[envId] - Delete environment
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; envId: string }> }
) {
  try {
    const { id: projectId, envId } = await params;
    const { user } = await requireProjectAdmin(projectId);

    await environmentService.delete(envId, user.id);
    return success({ success: true });
  } catch (err) {
    console.error('Delete environment error:', err);
    const response = handleAuthError(err);
    if (response) return response;

    if (err instanceof Error && err.message === 'Environment not found') {
      return error(err.message, 404);
    }
    return error('Internal server error', 500);
  }
}