import { NextRequest } from 'next/server';
import { requireProjectAccess } from '@/backend/middleware/auth';
import { success, error } from '@/backend/utils/api-response';
import { db } from '@/lib/db';
import { z } from 'zod';

const updateRoleSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  permissions: z.array(z.string()).optional(),
  isDefault: z.boolean().optional(),
});

// GET /api/projects/[id]/roles/[roleId] - Get single role
// PUT /api/projects/[id]/roles/[roleId] - Update role
// DELETE /api/projects/[id]/roles/[roleId] - Delete role
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; roleId: string }> }
) {
  try {
    const { id: projectId, roleId } = await params;
    // Viewing a single role requires settings:manage
    await requireProjectAccess(projectId, 'settings:manage');

    const role = await db.role.findUnique({
      where: { id: roleId },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    if (!role || role.projectId !== projectId) {
      return error('Role not found', 404);
    }

    return success(role);
  } catch (err) {
    console.error('Get role error:', err);
    const response = handleAuthError(err);
    if (response) return response;
    return error('Internal server error', 500);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; roleId: string }> }
) {
  try {
    const { id: projectId, roleId } = await params;
    await requireProjectAccess(projectId, 'member:manage');

    const existing = await db.role.findUnique({ where: { id: roleId } });
    if (!existing || existing.projectId !== projectId) {
      return error('Role not found', 404);
    }

    // Prevent editing system roles
    if (['admin', 'developer', 'viewer'].includes(existing.slug)) {
      return error('Cannot edit system roles', 400);
    }

    const body = await req.json();
    const data = updateRoleSchema.parse(body);

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await db.role.updateMany({
        where: { projectId, isDefault: true, id: { not: roleId } },
        data: { isDefault: false },
      });
    }

    const role = await db.role.update({
      where: { id: roleId },
      data: {
        name: data.name,
        permissions: data.permissions,
        isDefault: data.isDefault,
      },
    });

    return success(role);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return error(err.issues[0].message, 400);
    }
    console.error('Update role error:', err);
    const response = handleAuthError(err);
    if (response) return response;
    return error('Internal server error', 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; roleId: string }> }
) {
  try {
    const { id: projectId, roleId } = await params;
    await requireProjectAccess(projectId, 'member:manage');

    const existing = await db.role.findUnique({ where: { id: roleId } });
    if (!existing || existing.projectId !== projectId) {
      return error('Role not found', 404);
    }

    // Prevent deleting system roles
    if (['admin', 'developer', 'viewer'].includes(existing.slug)) {
      return error('Cannot delete system roles', 400);
    }

    // Check if role has members
    const memberCount = await db.projectMember.count({ where: { roleId } });
    if (memberCount > 0) {
      return error('Cannot delete role with members', 400);
    }

    await db.role.delete({ where: { id: roleId } });

    return success({ success: true });
  } catch (err) {
    console.error('Delete role error:', err);
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
