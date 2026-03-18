import { NextRequest } from 'next/server';
import { requireProjectAccess } from '@/backend/middleware/auth';
import { success, error } from '@/backend/utils/api-response';
import { rotationService, dynamicSecretService } from '@/backend/services';

/**
 * GET /api/projects/[id]/rotation-jobs - List rotation jobs
 * POST /api/projects/[id]/rotation-jobs - Create rotation job
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    await requireProjectAccess(projectId, 'secret:read');

    const jobs = await rotationService.getByProject(projectId);
    return success(jobs);
  } catch (err) {
    console.error('Get rotation jobs error:', err);
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
    await requireProjectAccess(projectId, 'secret:write');

    const body = await req.json();

    if (!body.name || !body.dynamicSecretId || !body.cronExpression) {
      return error('Missing required fields: name, dynamicSecretId, cronExpression', 400);
    }

    // Verify the dynamic secret belongs to this project
    const dynamicSecret = await dynamicSecretService.getById(body.dynamicSecretId);
    if (!dynamicSecret || dynamicSecret.projectId !== projectId) {
      return error('Dynamic secret not found', 404);
    }

    const job = await rotationService.create({
      name: body.name,
      dynamicSecretId: body.dynamicSecretId,
      cronExpression: body.cronExpression,
    });

    return success(job, 201);
  } catch (err) {
    console.error('Create rotation job error:', err);
    const response = handleAuthError(err);
    if (response) return response;

    if (err instanceof Error) {
      if (err.message.includes('already exists') || err.message.includes('Invalid cron')) {
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
    if (err.message === 'Access denied') {
      return error(err.message, 403);
    }
  }
  return null;
}
