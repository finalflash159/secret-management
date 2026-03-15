import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';

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
      orderBy: { slug: 'asc' },
    });

    return NextResponse.json(roles);
  } catch (error) {
    console.error('Get roles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
