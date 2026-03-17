import { NextRequest } from 'next/server';
import { requireAuth } from '@/backend/middleware/auth';
import { success, handleZodError, error } from '@/backend/utils/api-response';
import { createProjectSchema, listProjectsQuerySchema } from '@/backend/schemas';
import { projectService } from '@/backend/services';

/**
 * GET /api/projects - List projects
 * POST /api/projects - Create a new project
 */
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth();

    const { searchParams } = new URL(req.url);
    const query = listProjectsQuerySchema.parse({
      orgId: searchParams.get('orgId'),
    });

    const projects = await projectService.getProjects(user.id, query.orgId);
    return success(projects);
  } catch (err) {
    console.error('Get projects error:', err);
    const response = handleAuthError(err);
    if (response) return response;
    return error('Internal server error', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth();

    const body = await req.json();
    const data = createProjectSchema.parse(body);

    const project = await projectService.create(data, user.id);
    return success(project, 201);
  } catch (err) {
    console.error('Create project error:', err);
    const response = handleAuthError(err);
    if (response) return response;

    if (err instanceof Error) {
      if (err.message.includes('already exists') || err.message === 'Not a member of this organization') {
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
    if (err.message === 'Access denied') {
      return error(err.message, 403);
    }
  }
  return null;
}
