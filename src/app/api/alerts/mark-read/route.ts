import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { success, unauthorized, error } from '@/backend/utils/api-response';
import { alertService } from '@/backend/services';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorized();
    }

    const body = await request.json();
    const { alertId, markAll } = body;

    if (markAll) {
      // Mark all as read
      const { searchParams } = new URL(request.url);
      const orgId = searchParams.get('orgId') || undefined;
      const result = await alertService.markAllAsRead(session.user.id, orgId);
      return success({ updated: result.count });
    } else if (alertId) {
      // Mark single alert as read
      const result = await alertService.markAsRead(alertId, session.user.id);
      return success({ updated: result.count });
    } else {
      return error('Missing alertId or markAll', 400);
    }
  } catch (err) {
    console.error('Error marking alert as read:', err);
    return error('Failed to mark alert as read', 500);
  }
}
