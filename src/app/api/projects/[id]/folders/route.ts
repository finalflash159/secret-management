import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { z } from 'zod';

const createFolderSchema = z.object({
  name: z.string().min(1),
  envId: z.string(),
  parentId: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id: projectId } = await params;
    const { searchParams } = new URL(req.url);
    const envId = searchParams.get('envId');

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await hasPermission(session.user.id, projectId, 'secret:read');
    const project = await db.project.findUnique({ where: { id: projectId } });
    const isOwner = project?.ownerId === session.user.id;

    if (!hasAccess && !isOwner) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const where: Record<string, unknown> = { projectId };
    if (envId) where.envId = envId;

    const folders = await db.folder.findMany({
      where,
      include: {
        children: true,
        parent: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(folders);
  } catch (error) {
    console.error('Get folders error:', error);
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

    const hasAccess = await hasPermission(session.user.id, projectId, 'folder:manage');
    const project = await db.project.findUnique({ where: { id: projectId } });
    const isOwner = project?.ownerId === session.user.id;

    if (!hasAccess && !isOwner) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = createFolderSchema.parse(body);

    // Check if parent folder exists and belongs to same project/env
    if (validatedData.parentId) {
      const parent = await db.folder.findUnique({
        where: { id: validatedData.parentId },
      });
      if (!parent || parent.projectId !== projectId || parent.envId !== validatedData.envId) {
        return NextResponse.json({ error: 'Invalid parent folder' }, { status: 400 });
      }
    }

    // Check for duplicate folder name in same parent/env
    const existing = await db.folder.findFirst({
      where: {
        projectId,
        envId: validatedData.envId,
        parentId: validatedData.parentId || null,
        name: validatedData.name,
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Folder already exists in this location' }, { status: 400 });
    }

    const folder = await db.folder.create({
      data: {
        name: validatedData.name,
        projectId,
        envId: validatedData.envId,
        parentId: validatedData.parentId,
      },
      include: {
        parent: true,
        children: true,
      },
    });

    // Log audit
    await db.auditLog.create({
      data: {
        projectId,
        userId: session.user.id,
        action: 'created',
        targetType: 'folder',
        targetId: folder.id,
        metadata: { name: folder.name },
      },
    });

    return NextResponse.json(folder, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    console.error('Create folder error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
