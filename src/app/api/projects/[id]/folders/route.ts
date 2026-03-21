import { NextRequest } from 'next/server';
import { requireProjectAccess, handleAuthError } from '@/backend/middleware/auth';
import { success, handleZodError, error } from '@/backend/utils/api-response';
import { createFolderSchema, listFoldersQuerySchema } from '@/backend/schemas';
import { folderService } from '@/backend/services';

/**
 * GET /api/projects/[id]/folders - List folders
 * POST /api/projects/[id]/folders - Create folder
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    await requireProjectAccess(projectId, 'secret:read');

    const { searchParams } = new URL(req.url);
    const query = listFoldersQuerySchema.parse({
      envId: searchParams.get('envId') || undefined,
    });

    const folders = await folderService.getFolders(projectId, query);
    return success(folders);
  } catch (err) {
    console.error('Get folders error:', err);
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
    const { user } = await requireProjectAccess(projectId, 'folder:manage');

    const body = await req.json();
    const data = createFolderSchema.parse(body);

    const folder = await folderService.create(data, user.id, projectId);
    return success(folder, 201);
  } catch (err) {
    console.error('Create folder error:', err);
    const response = handleAuthError(err);
    if (response) return response;

    if (err instanceof Error) {
      if (err.message.includes('already exists') || err.message === 'Invalid parent folder') {
        return error(err.message, 400);
      }
    }
    return handleZodError(err);
  }
}