import { db } from '@/lib/db';

export type Permission =
  | 'secret:read'
  | 'secret:write'
  | 'secret:delete'
  | 'folder:manage'
  | 'member:manage'
  | 'settings:manage'
  | 'project:delete';

export const DEFAULT_PERMISSIONS: Record<string, Permission[]> = {
  admin: [
    'secret:read',
    'secret:write',
    'secret:delete',
    'folder:manage',
    'member:manage',
    'settings:manage',
    'project:delete',
  ],
  editor: [
    'secret:read',
    'secret:write',
    'secret:delete',
    'folder:manage',
  ],
  viewer: ['secret:read'],
};

/**
 * Get user's role in a project
 */
export async function getUserProjectRole(
  userId: string,
  projectId: string
) {
  const membership = await db.projectMember.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
    include: {
      role: true,
    },
  });

  return membership?.role ?? null;
}

/**
 * Check if user has a specific permission in a project
 */
export async function hasPermission(
  userId: string,
  projectId: string,
  permission: Permission
): Promise<boolean> {
  const role = await getUserProjectRole(userId, projectId);

  if (!role) {
    return false;
  }

  const permissions = role.permissions as Permission[];
  return permissions.includes(permission);
}

/**
 * Check if user is project owner or admin
 */
export async function isProjectAdmin(
  userId: string,
  projectId: string
): Promise<boolean> {
  const project = await db.project.findUnique({
    where: { id: projectId },
  });

  if (project?.ownerId === userId) {
    return true;
  }

  return hasPermission(userId, projectId, 'settings:manage');
}

/**
 * Get all permissions for a user in a project
 */
export async function getUserPermissions(
  userId: string,
  projectId: string
): Promise<Permission[]> {
  const role = await getUserProjectRole(userId, projectId);

  if (!role) {
    return [];
  }

  return role.permissions as Permission[];
}

/**
 * Check if user has access to a project (as owner or member)
 */
export async function hasProjectAccess(
  userId: string,
  projectId: string
): Promise<boolean> {
  const project = await db.project.findUnique({
    where: { id: projectId },
  });

  if (project?.ownerId === userId) {
    return true;
  }

  const membership = await db.projectMember.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
  });

  return !!membership;
}

/**
 * Get user's organization role
 */
export async function getUserOrgRole(userId: string, orgId: string) {
  const membership = await db.orgMember.findUnique({
    where: {
      userId_orgId: {
        userId,
        orgId,
      },
    },
  });

  return membership?.role ?? null;
}

/**
 * Check if user can manage organization
 */
export async function canManageOrg(
  userId: string,
  orgId: string
): Promise<boolean> {
  const role = await getUserOrgRole(userId, orgId);
  return role === 'owner' || role === 'admin';
}

/**
 * Check if user is organization owner
 */
export async function isOrgOwner(
  userId: string,
  orgId: string
): Promise<boolean> {
  const role = await getUserOrgRole(userId, orgId);
  return role === 'owner';
}
