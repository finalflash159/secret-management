import { NextRequest } from 'next/server';
import { requireProjectAccess, handleAuthError } from '@/backend/middleware/auth';
import { success, error } from '@/backend/utils/api-response';
import { dynamicSecretService } from '@/backend/services';

/**
 * GET /api/projects/[id]/dynamic-secrets/[dynamicSecretId] - Get dynamic secret
 * GET /api/projects/[id]/dynamic-secrets/[dynamicSecretId]/credentials - Get latest credentials
 * PUT /api/projects/[id]/dynamic-secrets/[dynamicSecretId] - Update dynamic secret
 * DELETE /api/projects/[id]/dynamic-secrets/[dynamicSecretId] - Delete dynamic secret
 * POST /api/projects/[id]/dynamic-secrets/[dynamicSecretId]/rotate - Rotate credentials
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; dynamicSecretId: string }> }
) {
  try {
    const { id: projectId, dynamicSecretId } = await params;
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    // Credentials endpoint
    if (action === 'credentials') {
      await requireProjectAccess(projectId, 'secret:read');

      const credentials = await dynamicSecretService.getLatestCredentials(dynamicSecretId);
      if (!credentials) {
        return error('No credentials found. Rotate to generate credentials.', 404);
      }
      return success(credentials);
    }

    await requireProjectAccess(projectId, 'secret:read');

    const dynamicSecret = await dynamicSecretService.getById(dynamicSecretId);

    if (!dynamicSecret || dynamicSecret.projectId !== projectId) {
      return error('Dynamic secret not found', 404);
    }

    return success(dynamicSecret);
  } catch (err) {
    console.error('Get dynamic secret error:', err);
    const response = handleAuthError(err);
    if (response) return response;
    return error('Internal server error', 500);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; dynamicSecretId: string }> }
) {
  try {
    const { id: projectId, dynamicSecretId } = await params;
    await requireProjectAccess(projectId, 'secret:write');

    const existing = await dynamicSecretService.getById(dynamicSecretId);
    if (!existing || existing.projectId !== projectId) {
      return error('Dynamic secret not found', 404);
    }

    const body = await req.json();
    const updateData: Record<string, unknown> = {};

    if (body.name) updateData.name = body.name;
    if (body.rotationPeriod) updateData.rotationPeriod = body.rotationPeriod;
    if (body.config) updateData.config = body.config;

    const updated = await dynamicSecretService.update(dynamicSecretId, updateData);
    return success(updated);
  } catch (err) {
    console.error('Update dynamic secret error:', err);
    const response = handleAuthError(err);
    if (response) return response;
    return error('Internal server error', 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; dynamicSecretId: string }> }
) {
  try {
    const { id: projectId, dynamicSecretId } = await params;
    const { user } = await requireProjectAccess(projectId, 'secret:delete');

    const existing = await dynamicSecretService.getById(dynamicSecretId);
    if (!existing || existing.projectId !== projectId) {
      return error('Dynamic secret not found', 404);
    }

    await dynamicSecretService.delete(dynamicSecretId, user.id);
    return success({ success: true });
  } catch (err) {
    console.error('Delete dynamic secret error:', err);
    const response = handleAuthError(err);
    if (response) return response;
    return error('Internal server error', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; dynamicSecretId: string }> }
) {
  try {
    const { id: projectId, dynamicSecretId } = await params;
    const { user } = await requireProjectAccess(projectId, 'secret:write');

    // Check if this is a rotate request
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'rotate') {
      const existing = await dynamicSecretService.getById(dynamicSecretId);
      if (!existing || existing.projectId !== projectId) {
        return error('Dynamic secret not found', 404);
      }

      const credentials = await dynamicSecretService.generateCredentials(dynamicSecretId, user.id);
      return success({
        message: 'Credentials generated successfully',
        ...credentials,
      });
    }

    return error('Invalid action', 400);
  } catch (err) {
    console.error('Dynamic secret action error:', err);
    const response = handleAuthError(err);
    if (response) return response;
    return error('Internal server error', 500);
  }
}