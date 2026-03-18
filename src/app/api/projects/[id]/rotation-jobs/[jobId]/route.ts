import { NextRequest } from 'next/server';
import { requireProjectAccess } from '@/backend/middleware/auth';
import { success, error } from '@/backend/utils/api-response';
import { rotationService } from '@/backend/services';

/**
 * GET /api/projects/[id]/rotation-jobs/[jobId] - Get rotation job
 * PUT /api/projects/[id]/rotation-jobs/[jobId] - Update rotation job
 * DELETE /api/projects/[id]/rotation-jobs/[jobId] - Delete rotation job
 * POST /api/projects/[id]/rotation-jobs/[jobId]/run - Run rotation now
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> }
) {
  try {
    const { id: projectId, jobId } = await params;
    await requireProjectAccess(projectId, 'secret:read');

    const job = await rotationService.getById(jobId);
    if (!job || job.dynamicSecret.projectId !== projectId) {
      return error('Rotation job not found', 404);
    }

    return success(job);
  } catch (err) {
    console.error('Get rotation job error:', err);
    const response = handleAuthError(err);
    if (response) return response;
    return error('Internal server error', 500);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> }
) {
  try {
    const { id: projectId, jobId } = await params;
    await requireProjectAccess(projectId, 'secret:write');

    const existing = await rotationService.getById(jobId);
    if (!existing || existing.dynamicSecret.projectId !== projectId) {
      return error('Rotation job not found', 404);
    }

    const body = await req.json();
    const updateData: Record<string, unknown> = {};

    if (body.name) updateData.name = body.name;
    if (body.cronExpression) updateData.cronExpression = body.cronExpression;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const updated = await rotationService.update(jobId, updateData);
    return success(updated);
  } catch (err) {
    console.error('Update rotation job error:', err);
    const response = handleAuthError(err);
    if (response) return response;

    if (err instanceof Error) {
      if (err.message.includes('Invalid cron')) {
        return error(err.message, 400);
      }
    }
    return error('Internal server error', 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> }
) {
  try {
    const { id: projectId, jobId } = await params;
    await requireProjectAccess(projectId, 'secret:write');

    const existing = await rotationService.getById(jobId);
    if (!existing || existing.dynamicSecret.projectId !== projectId) {
      return error('Rotation job not found', 404);
    }

    await rotationService.delete(jobId);
    return success({ success: true });
  } catch (err) {
    console.error('Delete rotation job error:', err);
    const response = handleAuthError(err);
    if (response) return response;
    return error('Internal server error', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> }
) {
  try {
    const { id: projectId, jobId } = await params;
    const { user } = await requireProjectAccess(projectId, 'secret:write');

    const existing = await rotationService.getById(jobId);
    if (!existing || existing.dynamicSecret.projectId !== projectId) {
      return error('Rotation job not found', 404);
    }

    const result = await rotationService.runNow(jobId, user.id);
    return success(result);
  } catch (err) {
    console.error('Run rotation job error:', err);
    const response = handleAuthError(err);
    if (response) return response;
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
