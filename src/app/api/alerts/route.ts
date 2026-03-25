import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { success, unauthorized, error } from '@/backend/utils/api-response';
import { alertService } from '@/backend/services';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId') || undefined;
    const projectId = searchParams.get('projectId') || undefined;
    const scopeParam = searchParams.get('scope');
    const type = searchParams.get('type') || undefined;
    const read = searchParams.get('read');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const scope =
      scopeParam === 'organization' || scopeParam === 'project'
        ? scopeParam
        : undefined;

    // Validate org membership if orgId is provided
    if (orgId) {
      const membership = await db.orgMember.findUnique({
        where: { userId_orgId: { userId: session.user.id, orgId } },
      });
      if (!membership) {
        return error('Not a member of this organization', 403);
      }
    }

    const result = await alertService.getAlerts({
      userId: session.user.id,
      orgId,
      projectId,
      scope,
      type: type as import('@prisma/client').AlertType | undefined,
      read: read === 'true' ? true : read === 'false' ? false : undefined,
      limit,
      offset,
    });

    return success(result);
  } catch (err) {
    console.error('Error fetching alerts:', err);
    return error('Failed to fetch alerts', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get('id');

    if (alertId) {
      // Delete single alert
      const result = await alertService.delete(alertId, session.user.id);
      return success({ deleted: result.count });
    } else {
      // Delete old read alerts (cleanup)
      const result = await alertService.cleanupOldAlerts(session.user.id);
      return success({ cleanedUp: result.count });
    }
  } catch (err) {
    console.error('Error deleting alert:', err);
    return error('Failed to delete alert', 500);
  }
}
