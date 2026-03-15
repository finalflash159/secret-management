import { auth } from './auth';
import { db } from './db';
import { hasPermission, isProjectAdmin, hasProjectAccess, type Permission } from './permissions';
import { unauthorized, forbidden, notFound } from './api-response';

/**
 * Current user type from session
 */
export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
}

/**
 * Result of requiring authentication
 */
export interface AuthResult {
  user: AuthUser;
}

/**
 * Result of requiring project access
 */
export interface ProjectAccessResult extends AuthResult {
  projectId: string;
  isOwner: boolean;
}

/**
 * Result of requiring org access
 */
export interface OrgAccessResult extends AuthUser {
  orgId: string;
  isOwner: boolean;
}

/**
 * Requires authentication - returns user or throws
 * Usage: const { user } = await requireAuth();
 */
export async function requireAuth(): Promise<AuthResult> {
  const session = await auth();

  if (!session?.user) {
    throw { status: 401, message: 'Unauthorized' };
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    },
  };
}

/**
 * Requires authentication and returns the response if unauthorized
 * Usage: return requireAuthResponse(); or const { user } = await requireAuthOrRespond();
 */
export function requireAuthResponse() {
  return unauthorized();
}

/**
 * Requires project access with optional permission check
 * Usage: const { user, projectId, isOwner } = await requireProjectAccess(params.id);
 */
export async function requireProjectAccess(
  projectId: string,
  permission?: Permission
): Promise<ProjectAccessResult> {
  const { user } = await requireAuth();

  // Check if user has any access to the project
  const access = await hasProjectAccess(user.id, projectId);
  if (!access) {
    throw { status: 403, message: 'Access denied' };
  }

  // Get project to check owner
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });

  if (!project) {
    throw { status: 404, message: 'Project not found' };
  }

  const isOwner = project.ownerId === user.id;

  // If permission is required, check it (owner bypasses permission check)
  if (permission && !isOwner) {
    const hasPerm = await hasPermission(user.id, projectId, permission);
    if (!hasPerm) {
      throw { status: 403, message: 'Insufficient permissions' };
    }
  }

  return {
    user,
    projectId,
    isOwner,
  };
}

/**
 * Requires project admin access (owner or settings:manage permission)
 * Usage: await requireProjectAdmin(projectId);
 */
export async function requireProjectAdmin(projectId: string): Promise<ProjectAccessResult> {
  const { user } = await requireAuth();

  const isAdmin = await isProjectAdmin(user.id, projectId);
  if (!isAdmin) {
    throw { status: 403, message: 'Admin access required' };
  }

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });

  return {
    user,
    projectId,
    isOwner: project?.ownerId === user.id,
  };
}

/**
 * Requires organization access with optional role
 * Usage: const { user, orgId, isOwner } = await requireOrgAccess(orgId);
 */
export async function requireOrgAccess(
  orgId: string,
  requiredRole: 'owner' | 'admin' | 'member' = 'member'
): Promise<OrgAccessResult> {
  const { user } = await requireAuth();

  // Check if user is a member of the org
  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { id: true },
  });

  if (!org) {
    throw { status: 404, message: 'Organization not found' };
  }

  const membership = await db.orgMember.findUnique({
    where: {
      userId_orgId: {
        userId: user.id,
        orgId,
      },
    },
  });

  if (!membership) {
    throw { status: 403, message: 'Not a member of this organization' };
  }

  // Check role requirements
  const userRole = membership.role;
  const isOwner = userRole === 'owner';
  const isAdmin = userRole === 'owner' || userRole === 'admin';

  if (requiredRole === 'owner' && !isOwner) {
    throw { status: 403, message: 'Owner access required' };
  }

  if (requiredRole === 'admin' && !isAdmin) {
    throw { status: 403, message: 'Admin access required' };
  }

  return {
    ...user,
    orgId,
    isOwner,
  };
}

/**
 * Requires organization owner access
 * Usage: await requireOrgOwner(orgId);
 */
export async function requireOrgOwner(orgId: string): Promise<OrgAccessResult> {
  return requireOrgAccess(orgId, 'owner');
}

/**
 * Requires organization access by slug
 * Usage: const { user, orgId, isOwner } = await requireOrgAccessBySlug(slug);
 */
export async function requireOrgAccessBySlug(
  slug: string,
  requiredRole: 'owner' | 'admin' | 'member' = 'member'
): Promise<OrgAccessResult> {
  // First get organization by slug
  const org = await db.organization.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!org) {
    throw { status: 404, message: 'Organization not found' };
  }

  return requireOrgAccess(org.id, requiredRole);
}

/**
 * Helper to handle auth errors in API routes
 * Returns the appropriate NextResponse if error, null otherwise
 */
export function handleAuthError(error: unknown): ReturnType<typeof unauthorized> | null {
  if (isAuthError(error)) {
    if (error.status === 401) {
      return unauthorized(error.message);
    }
    if (error.status === 403) {
      return forbidden(error.message);
    }
    if (error.status === 404) {
      return notFound(error.message);
    }
  }
  return null;
}

/**
 * Type guard for auth errors
 */
function isAuthError(error: unknown): error is { status: number; message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    'message' in error
  );
}


/**
 * Wrapper for API route handlers with project access
 */
export function withProjectAccess(
  permission?: Permission
) {
  return function (
    handler: (auth: ProjectAccessResult) => Promise<Response>
  ) {
    return async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
      try {
        const { id: projectId } = await context.params;
        const access = await requireProjectAccess(projectId, permission);
        return await handler(access);
      } catch (error) {
        const response = handleAuthError(error);
        if (response) {
          return response;
        }
        console.error('Unhandled error in withProjectAccess:', error);
        return unauthorized('Internal server error');
      }
    };
  };
}

// Need NextRequest type
import type { NextRequest } from 'next/server';
