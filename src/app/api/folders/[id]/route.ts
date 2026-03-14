import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { z } from 'zod';

const updateFolderSchema = z.object({
  name: z.string().min(1).optional(),
  parentId: z.string().nullable().optional(),
});

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

    const folder = await db.folder.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        secrets: {
          select: {
            id: true,
            key: true,
            version: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    const hasAccess = await hasPermission(session.user.id, folder.projectId, 'secret:read');
    const project = await db.project.findUnique({ where: { id: folder.projectId } });
    const isOwner = project?.ownerId === session.user.id;

    if (!hasAccess && !isOwner) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(folder);
  } catch (error) {
    console.error('Get folder error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const folder = await db.folder.findUnique({
      where: { id },
    });

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    const hasAccess = await hasPermission(session.user.id, folder.projectId, 'folder:manage');
    const project = await db.project.findUnique({ where: { id: folder.projectId } });
    const isOwner = project?.ownerId === session.user.id;

    if (!hasAccess && !isOwner) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = updateFolderSchema.parse(body);

    // Validate parent folder if changing
    if (validatedData.parentId !== undefined && validatedData.parentId !== null) {
      const parent = await db.folder.findUnique({
        where: { id: validatedData.parentId },
      });

      if (!parent || parent.projectId !== folder.projectId || parent.envId !== folder.envId) {
        return NextResponse.json({ error: 'Invalid parent folder' }, { status: 400 });
      }

      // Prevent moving a folder into itself or its descendants
      if (validatedData.parentId === id) {
        return NextResponse.json({ error: 'Cannot move folder into itself' }, { status: 400 });
      }
    }

    const updated = await db.folder.update({
      where: { id },
      data: {
        name: validatedData.name,
        parentId: validatedData.parentId,
      },
      include: {
        parent: true,
        children: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    console.error('Update folder error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const folder = await db.folder.findUnique({
      where: { id },
      include: {
        children: true,
        secrets: true,
      },
    });

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    const hasAccess = await hasPermission(session.user.id, folder.projectId, 'folder:manage');
    const project = await db.project.findUnique({ where: { id: folder.projectId } });
    const isOwner = project?.ownerId === session.user.id;

    if (!hasAccess && !isOwner) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Cannot delete folder with children or secrets
    if (folder.children.length > 0) {
      return NextResponse.json({ error: 'Cannot delete folder with subfolders' }, { status: 400 });
    }

    if (folder.secrets.length > 0) {
      return NextResponse.json({ error: 'Cannot delete folder with secrets' }, { status: 400 });
    }

    await db.folder.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete folder error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
