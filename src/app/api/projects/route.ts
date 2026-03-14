import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasProjectAccess, hasPermission, DEFAULT_PERMISSIONS } from '@/lib/permissions';
import { z } from 'zod';

const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
  orgId: z.string(),
  environments: z.array(z.object({
    name: z.string(),
    slug: z.string(),
  })).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const where = orgId ? {
      orgId,
      OR: [
        { ownerId: session.user.id },
        { members: { some: { userId: session.user.id } } },
      ],
    } : {
      OR: [
        { ownerId: session.user.id },
        { members: { some: { userId: session.user.id } } },
      ],
    };

    const projects = await db.project.findMany({
      where,
      include: {
        org: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        environments: true,
        _count: {
          select: {
            secrets: true,
            folders: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Get projects error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = createProjectSchema.parse(body);

    // Check if user is a member of the org
    const orgMember = await db.orgMember.findUnique({
      where: {
        userId_orgId: {
          userId: session.user.id,
          orgId: validatedData.orgId,
        },
      },
    });

    if (!orgMember) {
      return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 });
    }

    // Check if slug already exists in the org
    const existingProject = await db.project.findUnique({
      where: {
        orgId_slug: {
          orgId: validatedData.orgId,
          slug: validatedData.slug,
        },
      },
    });

    if (existingProject) {
      return NextResponse.json({ error: 'Project slug already exists in this organization' }, { status: 400 });
    }

    // Create project with default environments
    const defaultEnvs = validatedData.environments || [
      { name: 'Development', slug: 'dev' },
      { name: 'Staging', slug: 'staging' },
      { name: 'Production', slug: 'prod' },
    ];

    const project = await db.project.create({
      data: {
        name: validatedData.name,
        slug: validatedData.slug,
        orgId: validatedData.orgId,
        ownerId: session.user.id,
        environments: {
          create: defaultEnvs,
        },
        roles: {
          create: [
            {
              name: 'Admin',
              slug: 'admin',
              permissions: JSON.stringify(DEFAULT_PERMISSIONS.admin),
              isDefault: false,
            },
            {
              name: 'Editor',
              slug: 'editor',
              permissions: JSON.stringify(DEFAULT_PERMISSIONS.editor),
              isDefault: false,
            },
            {
              name: 'Viewer',
              slug: 'viewer',
              permissions: JSON.stringify(DEFAULT_PERMISSIONS.viewer),
              isDefault: true,
            },
          ],
        },
      },
      include: {
        environments: true,
        org: true,
      },
    });

    // Add owner as admin member
    const adminRole = await db.role.findFirst({
      where: {
        projectId: project.id,
        slug: 'admin',
      },
    });

    if (adminRole) {
      await db.projectMember.create({
        data: {
          userId: session.user.id,
          projectId: project.id,
          roleId: adminRole.id,
        },
      });
    }

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    console.error('Create project error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
