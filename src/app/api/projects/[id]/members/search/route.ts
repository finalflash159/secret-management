import { db } from '@/lib/db';
import { withProjectAccess } from '@/backend/middleware/auth';
import { success, error } from '@/backend/utils/api-response';

/**
 * GET /api/projects/[id]/members/search
 * Returns org members NOT already in the project (for autocomplete)
 * Requires: project access (any role)
 */
export const GET = withProjectAccess()(async (auth) => {
  const { projectId, user } = auth;
  try {
    // Get the project's org
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { orgId: true },
    });

    if (!project) {
      return error('Project not found', 404);
    }

    // Get current project member user IDs
    const existingMemberIds = await db.projectMember.findMany({
      where: { projectId },
      select: { userId: true },
    });
    const excludedIds = existingMemberIds.map((m) => m.userId);
    // Also exclude the current user
    excludedIds.push(user.id);

    // Get org members who are NOT in the project yet
    const availableMembers = await db.orgMember.findMany({
      where: {
        orgId: project.orgId,
        userId: { notIn: excludedIds },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        user: {
          email: 'asc',
        },
      },
    });

    const users = availableMembers
      .map((m) => m.user)
      .filter((u) => u.email); // ensure email exists

    return success(users);
  } catch (err) {
    console.error('Search project members error:', err);
    return error('Internal server error', 500);
  }
});
