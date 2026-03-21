import { NextRequest } from 'next/server';
import { requireProjectAccess, handleAuthError } from '@/backend/middleware/auth';
import { success, error } from '@/backend/utils/api-response';
import { db } from '@/lib/db';
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
    const { id } = await params;
    // Viewing roles requires settings:manage (sensitive info)
    await requireProjectAccess(id, 'settings:manage');

    const roles = await db.role.findMany({
      where: { projectId: id },
      include: {
        _count: {
          select: { members: true },
        },
      },
      orderBy: { slug: 'asc' },
    });

    return success(roles);
  } catch (err) {
    console.error('Get roles error:', err);
    const response = handleAuthError(err);
    if (response) return response;
    return error('Internal server error', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    await requireProjectAccess(projectId, 'member:manage');

    const body = await req.json();
    const data = createRoleSchema.parse(body);

    // Check if slug already exists
    const existing = await db.role.findUnique({
      where: { projectId_slug: { projectId, slug: data.slug } },
    });

    if (existing) {
      return error('Role with this slug already exists', 400);
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

    return success(role, 201);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return error(err.issues[0].message, 400);
    }
    console.error('Create role error:', err);
    const response = handleAuthError(err);
    if (response) return response;
    return error('Internal server error', 500);
  }
}