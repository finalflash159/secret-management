import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission, isProjectAdmin } from '@/lib/permissions';
import { z } from 'zod';

const createEnvSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
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

    const hasAccess = await hasPermission(session.user.id, id, 'secret:read');
    const project = await db.project.findUnique({ where: { id } });
    const isOwner = project?.ownerId === session.user.id;

    if (!hasAccess && !isOwner) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const environments = await db.projectEnvironment.findMany({
      where: { projectId: id },
      orderBy: { slug: 'asc' },
    });

    return NextResponse.json(environments);
  } catch (error) {
    console.error('Get environments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isProjectAdmin(session.user.id, id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = createEnvSchema.parse(body);

    // Check if slug already exists in project
    const existing = await db.projectEnvironment.findUnique({
      where: {
        projectId_slug: {
          projectId: id,
          slug: validatedData.slug,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Environment slug already exists' }, { status: 400 });
    }

    const environment = await db.projectEnvironment.create({
      data: {
        name: validatedData.name,
        slug: validatedData.slug,
        projectId: id,
      },
    });

    return NextResponse.json(environment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    console.error('Create environment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
