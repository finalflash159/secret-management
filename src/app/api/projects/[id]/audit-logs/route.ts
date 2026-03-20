import { NextRequest } from 'next/server';
import { requireProjectAccess } from '@/backend/middleware/auth';
import { success, error } from '@/backend/utils/api-response';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Viewing audit logs requires settings:manage (sensitive operational data)
    await requireProjectAccess(id, 'settings:manage');

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const logs = await db.auditLog.findMany({
      where: { projectId: id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return success(logs);
  } catch (err) {
    console.error('Get audit logs error:', err);
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
    if (err.message === 'Access denied' || err.message === 'Insufficient permissions') {
      return error(err.message, 403);
    }
  }
  return null;
}
