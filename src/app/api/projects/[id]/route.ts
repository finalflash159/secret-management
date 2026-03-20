import { NextRequest } from 'next/server';
import { requireProjectAccess } from '@/backend/middleware/auth';
import { success, handleZodError, error, notFound } from '@/backend/utils/api-response';
import { updateProjectSchema } from '@/backend/schemas';
import { projectService } from '@/backend/services';

/**
 * GET /api/projects/[id] - Get a project
 * PUT /api/projects/[id] - Update a project
 * DELETE /api/projects/[id] - Delete a project
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireProjectAccess(id);

    const project = await projectService.getProjectById(id);

    if (!project) {
      return notFound('Project not found');
    }

    return success(project);
  } catch (err) {
    console.error('Get project error:', err);
    const response = handleAuthError(err);
    if (response) return response;
    return error('Internal server error', 500);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireProjectAccess(id, 'settings:manage');

    const body = await req.json();
    const data = updateProjectSchema.parse(body);

    const project = await projectService.update(id, data);
    return success(project);
  } catch (err) {
    console.error('Update project error:', err);
    const response = handleAuthError(err);
    if (response) return response;
    return handleZodError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, isOwner } = await requireProjectAccess(id);

    // Check if owner can delete
    const project = await projectService.getProjectById(id);
    if (!project) {
      return notFound('Project not found');
    }

    // Only owner or users with project:delete permission can delete
    if (!isOwner) {
      return error('Only owner or users with project:delete permission can delete project', 403);
    }

    await projectService.delete(id, user.id);
    return success({ success: true });
  } catch (err) {
    console.error('Delete project error:', err);
    const response = handleAuthError(err);
    if (response) return response;
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
    if (err.message === 'Access denied' || err.message === 'Admin access required') {
      return error(err.message, 403);
    }
    if (err.message === 'Project not found') {
      return notFound(err.message);
    }
  }
  return null;
}
