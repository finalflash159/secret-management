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

    // Validate org membership if orgId is provided
    if (orgId) {
      const membership = await db.orgMember.findUnique({
        where: { userId_orgId: { userId: session.user.id, orgId } },
      });
      if (!membership) {
        return error('Not a member of this organization', 403);
      }
    }

    const count = await alertService.getUnreadCount(session.user.id, orgId);

    return success({ count });
  } catch (err) {
    console.error('Error fetching unread count:', err);
    return error('Failed to fetch unread count', 500);
  }
}
