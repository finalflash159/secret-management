import { db } from '@/lib/db';
import { encrypt, decrypt, getMasterKey } from '@/lib/encryption';
import { auditService } from './audit.service';
import type { CreateSecretInput, UpdateSecretInput, ListSecretsQuery } from '@/backend/schemas';
import type { Secret, Folder } from '@prisma/client';

/**
 * Environment info (minimal type for API responses)
 */
interface EnvironmentInfo {
  id: string;
  name: string;
  slug: string;
}

/**
 * Project info for API responses
 */
interface ProjectInfo {
  id: string;
  ownerId: string;
}

/**
 * Secret list item (without decrypted value - for list view)
 */
export interface SecretListItem {
  id: string;
  key: string;
  envId: string;
  folderId: string;
  projectId: string;
  version: number;
  expiresAt: Date | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string | null;
  environment: EnvironmentInfo;
  folder: Folder;
}

/**
 * Secret with decrypted value
 */
export interface SecretWithDecryptedValue extends Secret {
  value: string;
  folder: Folder;
  environment: EnvironmentInfo;
  project?: ProjectInfo;
  createdBy: string;
  updatedBy: string | null;
}

/**
 * Paginated secrets response
 */
export interface PaginatedSecrets {
  data: (SecretListItem | SecretWithDecryptedValue)[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Secret service - handles all secret operations including encryption
 */
export const secretService = {
  /**
   * Get secrets for a project with pagination
   * By default, does NOT decrypt values for performance (list view)
   * Set decrypt=true to get decrypted values (detail view)
   */
  async getSecrets(
    projectId: string,
    query: Partial<ListSecretsQuery> = {}
  ): Promise<PaginatedSecrets> {
    const { page = 1, limit = 50, envId, folderId, decrypt = false } = query;

    const where: Record<string, unknown> = { projectId };
    if (envId) where.envId = envId;
    if (folderId) where.folderId = folderId;

    // Get total count
    const total = await db.secret.count({ where });

    // Get paginated secrets
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
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        updatedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { key: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // If decrypt is true, decrypt all values (for detail view)
    // Otherwise, return list without decrypted values
    let data: (SecretListItem | SecretWithDecryptedValue)[];

    if (decrypt) {
      // Return decrypted secrets (for detail view)
      data = secrets.map((secret) => ({
        ...this.decryptSecret(secret),
        id: secret.id,
        key: secret.key,
        envId: secret.envId,
        folderId: secret.folderId,
        projectId: secret.projectId,
        version: secret.version,
        expiresAt: secret.expiresAt,
        metadata: secret.metadata as Record<string, unknown> | null,
        createdAt: secret.createdAt,
        updatedAt: secret.updatedAt,
        environment: secret.environment,
        folder: secret.folder,
        createdBy: secret.createdByUser.name || secret.createdByUser.email,
        updatedBy: secret.updatedByUser ? (secret.updatedByUser.name || secret.updatedByUser.email) : null,
      } as SecretWithDecryptedValue));
    } else {
      // Return list items without decrypted values (for list view)
      data = secrets.map((secret) => ({
        id: secret.id,
        key: secret.key,
        envId: secret.envId,
        folderId: secret.folderId,
        projectId: secret.projectId,
        version: secret.version,
        expiresAt: secret.expiresAt,
        metadata: secret.metadata as Record<string, unknown> | null,
        createdAt: secret.createdAt,
        updatedAt: secret.updatedAt,
        environment: secret.environment,
        folder: secret.folder,
        createdBy: secret.createdByUser.name || secret.createdByUser.email,
        updatedBy: secret.updatedByUser ? (secret.updatedByUser.name || secret.updatedByUser.email) : null,
      } as SecretListItem));
    }

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Get a single secret by ID
   */
  async getSecretById(id: string): Promise<SecretWithDecryptedValue | null> {
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
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        updatedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!secret) return null;

    return {
      ...this.decryptSecret(secret),
      project: secret.project,
      createdBy: secret.createdByUser.name || secret.createdByUser.email,
      updatedBy: secret.updatedByUser ? (secret.updatedByUser.name || secret.updatedByUser.email) : null,
    };
  },

  /**
   * Create a new secret
   */
  async create(
    data: CreateSecretInput,
    userId: string,
    projectId: string
  ): Promise<SecretWithDecryptedValue> {
    // Get or create root folder if no folder specified
    let folderId = data.folderId;
    if (!folderId) {
      const rootFolder = await this.getOrCreateRootFolder(projectId, data.envId);
      folderId = rootFolder.id;
    }

    // Verify folder belongs to project and environment
    const folder = await db.folder.findFirst({
      where: {
        id: folderId,
        projectId,
        envId: data.envId,
      },
    });

    if (!folder) {
      throw new Error('Invalid folder');
    }

    // Check if secret already exists
    const existing = await db.secret.findUnique({
      where: {
        projectId_envId_folderId_key: {
          projectId,
          envId: data.envId,
          folderId,
          key: data.key,
        },
      },
    });

    if (existing) {
      throw new Error('Secret key already exists in this environment and folder');
    }

    // Encrypt the secret value
    const encrypted = encrypt(data.value);
    const encryptedValue = JSON.stringify(encrypted);

    // Create secret with initial version
    const secret = await db.secret.create({
      data: {
        key: data.key,
        value: encryptedValue,
        envId: data.envId,
        folderId,
        projectId,
        createdBy: userId,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        metadata: data.metadata as object | undefined,
        versions: {
          create: {
            value: encryptedValue,
            version: 1,
            createdBy: userId,
          },
        },
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

    // Log audit
    await auditService.logSecretCreated(secret.id, secret.key, userId, projectId);

    return {
      ...secret,
      value: data.value, // Return decrypted value
    };
  },

  /**
   * Update an existing secret
   */
  async update(
    id: string,
    data: UpdateSecretInput,
    userId: string
  ): Promise<SecretWithDecryptedValue> {
    const secret = await db.secret.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!secret) {
      throw new Error('Secret not found');
    }

    const updateData: Record<string, unknown> = {};
    const projectId = secret.projectId;

    if (data.key) {
      updateData.key = data.key;
    }

    if (data.folderId) {
      updateData.folderId = data.folderId;
    }

    if (data.metadata) {
      updateData.metadata = data.metadata;
    }

    // Handle expiresAt - can be a date string or null to remove
    if (data.expiresAt !== undefined) {
      updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    }

    // If value is being updated, encrypt it and create a new version
    if (data.value) {
      const encrypted = encrypt(data.value);
      updateData.value = JSON.stringify(encrypted);
      updateData.version = { increment: 1 };
      updateData.updatedBy = userId;

      // Create new version
      await db.secretVersion.create({
        data: {
          secretId: id,
          value: JSON.stringify(encrypted),
          version: secret.version + 1,
          createdBy: userId,
        },
      });
    }

    const updated = await db.secret.update({
      where: { id },
      data: updateData,
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

    // Log audit
    await auditService.logSecretUpdated(updated.id, updated.key, userId, projectId);

    return {
      ...updated,
      value: data.value || secret.value, // Return the new or old value
    };
  },

  /**
   * Delete a secret
   */
  async delete(id: string, userId: string): Promise<void> {
    const secret = await db.secret.findUnique({
      where: { id },
    });

    if (!secret) {
      throw new Error('Secret not found');
    }

    const projectId = secret.projectId;
    const key = secret.key;

    await db.secret.delete({
      where: { id },
    });

    // Log audit
    await auditService.logSecretDeleted(id, key, userId, projectId);
  },

  /**
   * Helper: Get or create root folder for an environment
   */
  async getOrCreateRootFolder(projectId: string, envId: string) {
    let rootFolder = await db.folder.findFirst({
      where: {
        projectId,
        envId,
        parentId: null,
        name: 'root',
      },
    });

    if (!rootFolder) {
      rootFolder = await db.folder.create({
        data: {
          name: 'root',
          projectId,
          envId,
        },
      });
    }

    return rootFolder;
  },

  /**
   * Helper: Decrypt a secret's value
   */
  decryptSecret<T extends { value: string }>(secret: T): T & { value: string } {
    try {
      const parsed = JSON.parse(secret.value);
      if (parsed.ciphertext && parsed.iv && parsed.tag) {
        // Use the default master key from getMasterKey()
        const decryptedValue = decrypt(parsed.ciphertext, getMasterKey(), parsed.iv, parsed.tag);
        return {
          ...secret,
          value: decryptedValue,
        };
      }
    } catch {
      // If parsing fails, return as-is (might be legacy data)
    }
    return {
      ...secret,
      value: secret.value,
    };
  },
};
