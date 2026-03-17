import { NextRequest } from 'next/server';
import { requireProjectAccess } from '@/backend/middleware/auth';
import { success, error } from '@/backend/utils/api-response';
import { auditService, secretService } from '@/backend/services';

/**
 * GET /api/secrets/[id]/audit-logs - Get audit logs for a secret
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: secretId } = await params;

    // Get the secret first to find projectId
    const secret = await secretService.getSecretById(secretId);

    if (!secret) {
      return error('Secret not found', 404);
    }

    // Check access to the project
    await requireProjectAccess(secret.projectId, 'secret:read');

    // Get audit logs for this secret
    const logs = await auditService.getSecretLogs(secretId);

    // Format for frontend
    const formattedLogs = logs.map((log) => ({
      id: log.id,
      action: getActionText(log.action),
      user: log.user.name || log.user.email,
      timestamp: formatTimestamp(log.createdAt),
    }));

    return success(formattedLogs);
  } catch (err) {
    console.error('Get audit logs error:', err);
    return error('Internal server error', 500);
  }
}

function getActionText(action: string): string {
  switch (action) {
    case 'created':
      return 'created secret';
    case 'updated':
      return 'updated secret';
    case 'deleted':
      return 'deleted secret';
    case 'viewed':
      return 'viewed secret';
    case 'exported':
      return 'exported secret';
    default:
      return action;
  }
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
