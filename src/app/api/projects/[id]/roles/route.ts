import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/backend/middleware/permissions';
import { z } from 'zod';

const createRoleSchema = z.object({
  name: z.string().min(1).max(50),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  permissions: z.array(z.string()),
  isDefault: z.boolean().default(false),
});

// GET /api/projects/[id]/roles - List roles
// POST /api/projects/[id]/roles - Create role
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await hasPermission(session.user.id, id, 'secret:read');
    const project = await db.project.findUnique({ where: { id } });
    const isOwner = project?.ownerId === session.user.id;

    if (!hasAccess && !isOwner) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const roles = await db.role.findMany({
      where: { projectId: id },
      include: {
        _count: {
          select: { members: true },
        },
      },
      orderBy: { slug: 'asc' },
    });

    return NextResponse.json(roles);
  } catch (error) {
    console.error('Get roles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id: projectId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const project = await db.project.findUnique({ where: { id: projectId } });
    const isOwner = project?.ownerId === session.user.id;
    const hasAccess = await hasPermission(session.user.id, projectId, 'member:manage');

    if (!hasAccess && !isOwner) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const data = createRoleSchema.parse(body);

    // Check if slug already exists
    const existing = await db.role.findUnique({
      where: { projectId_slug: { projectId, slug: data.slug } },
    });

    if (existing) {
      return NextResponse.json({ error: 'Role with this slug already exists' }, { status: 400 });
    }

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await db.role.updateMany({
        where: { projectId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const role = await db.role.create({
      data: {
        name: data.name,
        slug: data.slug,
        permissions: data.permissions,
        isDefault: data.isDefault,
        projectId,
      },
    });

    return NextResponse.json(role, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error('Create role error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
