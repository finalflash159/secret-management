import { NextRequest } from 'next/server';
import { requireAuth, requireOrgAccess, handleAuthError } from '@/backend/middleware/auth';
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
      orgId: searchParams.get('orgId') || undefined,
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

    // Require admin role in the org to create projects
    await requireOrgAccess(data.orgId, 'admin');

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
      if (err.message.includes('access required')) {
        return error(err.message, 403);
      }
    }
    // Handle plain { status, message } objects from requireOrgAccess
    if (typeof err === 'object' && err !== null && 'status' in err) {
      const e = err as { status: number; message: string };
      return error(e.message, e.status);
    }
    return handleZodError(err);
  }
}
