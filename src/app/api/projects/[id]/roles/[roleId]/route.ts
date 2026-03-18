import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/backend/middleware/permissions';
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
    const session = await auth();
    const { id: projectId, roleId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await hasPermission(session.user.id, projectId, 'secret:read');
    const project = await db.project.findUnique({ where: { id: projectId } });
    const isOwner = project?.ownerId === session.user.id;

    if (!hasAccess && !isOwner) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const role = await db.role.findUnique({
      where: { id: roleId },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    if (!role || role.projectId !== projectId) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    return NextResponse.json(role);
  } catch (error) {
    console.error('Get role error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; roleId: string }> }
) {
  try {
    const session = await auth();
    const { id: projectId, roleId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const project = await db.project.findUnique({ where: { id: projectId } });
    const isOwner = project?.ownerId === session.user.id;
    const hasAccess = await hasPermission(session.user.id, projectId, 'member:manage');

    if (!hasAccess && !isOwner) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const existing = await db.role.findUnique({ where: { id: roleId } });
    if (!existing || existing.projectId !== projectId) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Prevent editing system roles
    if (['admin', 'editor', 'viewer'].includes(existing.slug)) {
      return NextResponse.json({ error: 'Cannot edit system roles' }, { status: 400 });
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

    return NextResponse.json(role);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error('Update role error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; roleId: string }> }
) {
  try {
    const session = await auth();
    const { id: projectId, roleId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const project = await db.project.findUnique({ where: { id: projectId } });
    const isOwner = project?.ownerId === session.user.id;
    const hasAccess = await hasPermission(session.user.id, projectId, 'member:manage');

    if (!hasAccess && !isOwner) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const existing = await db.role.findUnique({ where: { id: roleId } });
    if (!existing || existing.projectId !== projectId) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Prevent deleting system roles
    if (['admin', 'editor', 'viewer'].includes(existing.slug)) {
      return NextResponse.json({ error: 'Cannot delete system roles' }, { status: 400 });
    }

    // Check if role has members
    const memberCount = await db.projectMember.count({ where: { roleId } });
    if (memberCount > 0) {
      return NextResponse.json({ error: 'Cannot delete role with members' }, { status: 400 });
    }

    await db.role.delete({ where: { id: roleId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete role error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
