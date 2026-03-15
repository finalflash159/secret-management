import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { success, unauthorized, error } from '@/lib/api-response';
import { alertService } from '@/lib/services';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId') || undefined;

    const count = await alertService.getUnreadCount(session.user.id, orgId);

    return success({ count });
  } catch (err) {
    console.error('Error fetching unread count:', err);
    return error('Failed to fetch unread count', 500);
  }
}
