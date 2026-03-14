import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { encrypt, decrypt } from '@/lib/encryption';
import { z } from 'zod';

const createSecretSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  envId: z.string(),
  folderId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
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
    const folderId = searchParams.get('folderId');

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
    if (folderId) where.folderId = folderId;

    const secrets = await db.secret.findMany({
      where,
      include: {
        folder: true,
        environment: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { key: 'asc' },
    });

    // Decrypt secret values - use same key derivation as encryption
    const decryptedSecrets = secrets.map(secret => {
      try {
        const { ciphertext, iv, tag } = JSON.parse(secret.value);
        // Hash the master key to get the same key used for encryption
        const masterKey = process.env.MASTER_KEY || '';
        const hashedKey = require('crypto').createHash('sha256').update(masterKey).digest();
        const decryptedValue = decrypt(ciphertext, hashedKey, iv, tag);
        return {
          ...secret,
          value: decryptedValue,
        };
      } catch (e) {
        // If parsing fails, return as-is (might be legacy data)
        console.error('Decryption error:', e);
        return {
          ...secret,
          value: secret.value,
        };
      }
    });

    return NextResponse.json(decryptedSecrets);
  } catch (error) {
    console.error('Get secrets error:', error);
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

    const hasAccess = await hasPermission(session.user.id, projectId, 'secret:write');
    const project = await db.project.findUnique({ where: { id: projectId } });
    const isOwner = project?.ownerId === session.user.id;

    if (!hasAccess && !isOwner) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = createSecretSchema.parse(body);

    // Get root folder for the environment if no folder specified
    let folderId = validatedData.folderId;
    if (!folderId) {
      let rootFolder = await db.folder.findFirst({
        where: {
          projectId,
          envId: validatedData.envId,
          parentId: null,
          name: 'root',
        },
      });

      if (!rootFolder) {
        rootFolder = await db.folder.create({
          data: {
            name: 'root',
            projectId,
            envId: validatedData.envId,
          },
        });
      }
      folderId = rootFolder.id;
    }

    // Encrypt the secret value
    const encrypted = encrypt(validatedData.value);
    const encryptedValue = JSON.stringify(encrypted);

    // Check if secret already exists
    const existing = await db.secret.findUnique({
      where: {
        projectId_envId_folderId_key: {
          projectId,
          envId: validatedData.envId,
          folderId,
          key: validatedData.key,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Secret key already exists in this environment and folder' }, { status: 400 });
    }

    const secret = await db.secret.create({
      data: {
        key: validatedData.key,
        value: encryptedValue,
        envId: validatedData.envId,
        folderId,
        projectId,
        createdBy: session.user.id,
        metadata: validatedData.metadata,
      },
      include: {
        folder: true,
        environment: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // Create initial version
    await db.secretVersion.create({
      data: {
        secretId: secret.id,
        value: encryptedValue,
        version: 1,
        createdBy: session.user.id,
      },
    });

    // Log audit
    await db.auditLog.create({
      data: {
        projectId,
        userId: session.user.id,
        action: 'created',
        targetType: 'secret',
        targetId: secret.id,
        metadata: { key: secret.key },
      },
    });

    return NextResponse.json({
      ...secret,
      value: validatedData.value,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    console.error('Create secret error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
