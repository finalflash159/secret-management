import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { encrypt, decrypt } from '@/lib/encryption';
import { z } from 'zod';

const updateSecretSchema = z.object({
  key: z.string().min(1).optional(),
  value: z.string().optional(),
  folderId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
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

    const secret = await db.secret.findUnique({
      where: { id },
      include: {
        folder: true,
        environment: true,
        project: {
          select: {
            id: true,
            ownerId: true,
          },
        },
      },
    });

    if (!secret) {
      return NextResponse.json({ error: 'Secret not found' }, { status: 404 });
    }

    const hasAccess = await hasPermission(session.user.id, secret.projectId, 'secret:read');
    const isOwner = secret.project.ownerId === session.user.id;

    if (!hasAccess && !isOwner) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Decrypt the value
    try {
      const { ciphertext, iv, tag } = JSON.parse(secret.value);
      const decryptedValue = decrypt(ciphertext, Buffer.from(process.env.MASTER_KEY || '', 'utf8'), iv, tag);
      return NextResponse.json({
        ...secret,
        value: decryptedValue,
      });
    } catch {
      return NextResponse.json({
        ...secret,
        value: secret.value,
      });
    }
  } catch (error) {
    console.error('Get secret error:', error);
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

    const secret = await db.secret.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!secret) {
      return NextResponse.json({ error: 'Secret not found' }, { status: 404 });
    }

    const hasAccess = await hasPermission(session.user.id, secret.projectId, 'secret:write');
    const isOwner = secret.project.ownerId === session.user.id;

    if (!hasAccess && !isOwner) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = updateSecretSchema.parse(body);

    const updateData: Record<string, unknown> = {};

    if (validatedData.key) {
      updateData.key = validatedData.key;
    }

    if (validatedData.folderId) {
      updateData.folderId = validatedData.folderId;
    }

    if (validatedData.metadata) {
      updateData.metadata = validatedData.metadata;
    }

    // If value is being updated, encrypt it and create a new version
    if (validatedData.value) {
      const encrypted = encrypt(validatedData.value);
      updateData.value = JSON.stringify(encrypted);
      updateData.version = { increment: 1 };
      updateData.updatedBy = session.user.id;

      // Create new version
      await db.secretVersion.create({
        data: {
          secretId: id,
          value: JSON.stringify(encrypted),
          version: secret.version + 1,
          createdBy: session.user.id,
        },
      });
    }

    const updated = await db.secret.update({
      where: { id },
      data: updateData,
      include: {
        folder: true,
        environment: true,
      },
    });

    // Log audit
    await db.auditLog.create({
      data: {
        projectId: secret.projectId,
        userId: session.user.id,
        action: 'updated',
        targetType: 'secret',
        targetId: secret.id,
        metadata: { key: updated.key },
      },
    });

    return NextResponse.json({
      ...updated,
      value: validatedData.value || secret.value,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    console.error('Update secret error:', error);
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

    const secret = await db.secret.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!secret) {
      return NextResponse.json({ error: 'Secret not found' }, { status: 404 });
    }

    const hasAccess = await hasPermission(session.user.id, secret.projectId, 'secret:delete');
    const isOwner = secret.project.ownerId === session.user.id;

    if (!hasAccess && !isOwner) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await db.secret.delete({
      where: { id },
    });

    // Log audit
    await db.auditLog.create({
      data: {
        projectId: secret.projectId,
        userId: session.user.id,
        action: 'deleted',
        targetType: 'secret',
        targetId: secret.id,
        metadata: { key: secret.key },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete secret error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
