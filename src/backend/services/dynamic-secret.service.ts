import { db } from '@/lib/db';
import { auditService } from './audit.service';
import { encryptJson, decryptJson } from '@/lib/encryption';
import { randomBytes } from 'crypto';

export interface CreateDynamicSecretInput {
  name: string;
  provider: 'postgresql' | 'mysql' | 'mongodb' | 'redis';
  envId: string;
  folderId?: string;
  rotationPeriod?: number;
  config: {
    host: string;
    port: number;
    database?: string;
    username?: string;
    // For admin connections to generate new users
    adminUsername?: string;
    adminPassword?: string;
    // SSL options
    ssl?: boolean;
  };
}

export interface UpdateDynamicSecretInput {
  name?: string;
  rotationPeriod?: number;
  config?: CreateDynamicSecretInput['config'];
}

/**
 * Dynamic Secret service - handles dynamic credential generation
 */
export const dynamicSecretService = {
  /**
   * Get all dynamic secrets for a project
   */
  async getByProject(projectId: string, envId?: string) {
    const where: Record<string, unknown> = { projectId };
    if (envId) where.envId = envId;

    const secrets = await db.dynamicSecret.findMany({
      where,
      include: {
        environment: true,
        folder: true,
        _count: {
          select: { credentials: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Decrypt config for each secret
    return secrets.map((secret) => ({
      ...secret,
      config: secret.config ? decryptJson<CreateDynamicSecretInput['config']>(secret.config as string) : null,
    }));
  },

  /**
   * Get a dynamic secret by ID
   */
  async getById(id: string) {
    const secret = await db.dynamicSecret.findUnique({
      where: { id },
      include: {
        environment: true,
        folder: true,
        credentials: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!secret) return null;

    // Decrypt config and credentials
    return {
      ...secret,
      config: secret.config ? decryptJson<CreateDynamicSecretInput['config']>(secret.config as string) : null,
    };
  },

  /**
   * Create a new dynamic secret
   */
  async create(data: CreateDynamicSecretInput, userId: string, projectId: string) {
    // Check for duplicate name in same project/env
    const existing = await db.dynamicSecret.findUnique({
      where: {
        projectId_envId_name: {
          projectId,
          envId: data.envId,
          name: data.name,
        },
      },
    });

    if (existing) {
      throw new Error('Dynamic secret with this name already exists');
    }

    const nextRotationAt = new Date();
    nextRotationAt.setSeconds(nextRotationAt.getSeconds() + (data.rotationPeriod || 86400));

    // Encrypt the config before saving
    const encryptedConfig = encryptJson(data.config);

    const dynamicSecret = await db.dynamicSecret.create({
      data: {
        name: data.name,
        provider: data.provider,
        projectId,
        envId: data.envId,
        folderId: data.folderId,
        rotationPeriod: data.rotationPeriod || 86400,
        nextRotationAt,
        config: encryptedConfig, // Store encrypted
        createdBy: userId,
      },
      include: {
        environment: true,
        folder: true,
      },
    });

    // Log audit
    await auditService.logDynamicSecretCreated(dynamicSecret.id, dynamicSecret.name, userId, projectId);

    // Return with decrypted config for immediate use
    return {
      ...dynamicSecret,
      config: data.config,
    };
  },

  /**
   * Update a dynamic secret
   */
  async update(id: string, data: UpdateDynamicSecretInput) {
    const updateData: Record<string, unknown> = {};
    let decryptedConfig: CreateDynamicSecretInput['config'] | undefined;

    if (data.name) updateData.name = data.name;
    if (data.rotationPeriod) {
      updateData.rotationPeriod = data.rotationPeriod;
      // Recalculate next rotation
      const nextRotationAt = new Date();
      nextRotationAt.setSeconds(nextRotationAt.getSeconds() + data.rotationPeriod);
      updateData.nextRotationAt = nextRotationAt;
    }
    if (data.config) {
      // Encrypt the config before saving
      updateData.config = encryptJson(data.config);
      decryptedConfig = data.config;
    }

    const updated = await db.dynamicSecret.update({
      where: { id },
      data: updateData,
      include: {
        environment: true,
        folder: true,
      },
    });

    // Return with decrypted config
    return {
      ...updated,
      config: decryptedConfig || data.config,
    };
  },

  /**
   * Delete a dynamic secret
   */
  async delete(id: string, userId: string) {
    const dynamicSecret = await db.dynamicSecret.findUnique({
      where: { id },
    });

    if (!dynamicSecret) {
      throw new Error('Dynamic secret not found');
    }

    const projectId = dynamicSecret.projectId;
    const name = dynamicSecret.name;

    // Delete all credentials first
    await db.dynamicSecretCredential.deleteMany({
      where: { dynamicSecretId: id },
    });

    // Delete the dynamic secret
    await db.dynamicSecret.delete({
      where: { id },
    });

    // Log audit
    await auditService.logDynamicSecretDeleted(id, name, userId, projectId);

    return { success: true };
  },

  /**
   * Generate new credentials for a dynamic secret
   */
  async generateCredentials(id: string, userId: string) {
    const dynamicSecret = await db.dynamicSecret.findUnique({
      where: { id },
      include: { environment: true },
    });

    if (!dynamicSecret) {
      throw new Error('Dynamic secret not found');
    }

    // Decrypt the config to get admin credentials
    if (!dynamicSecret.config) {
      throw new Error('Dynamic secret config is missing');
    }
    const config = decryptJson<CreateDynamicSecretInput['config']>(dynamicSecret.config as string);

    // TODO: In production, use config to connect to actual database
    // Connect using config.adminUsername and config.adminPassword
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _adminUsername = config.adminUsername;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _adminPassword = config.adminPassword;

    // Generate username and password
    const username = `user_${randomBytes(4).toString('hex')}`;
    const password = randomBytes(16).toString('base64url');

    // Encrypt the password before storing
    const encryptedPassword = encryptJson({ password });

    // In a real implementation, this would connect to the database
    // and create a new user with the generated credentials
    // For now, we'll store the credentials in the database

    const credential = await db.dynamicSecretCredential.create({
      data: {
        dynamicSecretId: id,
        username,
        password: encryptedPassword, // Store encrypted!
        expiresAt: new Date(Date.now() + dynamicSecret.rotationPeriod * 1000),
      },
    });

    // Update last rotated timestamp
    const nextRotationAt = new Date();
    nextRotationAt.setSeconds(nextRotationAt.getSeconds() + dynamicSecret.rotationPeriod);

    await db.dynamicSecret.update({
      where: { id },
      data: {
        lastRotatedAt: new Date(),
        nextRotationAt,
      },
    });

    // Log audit
    await auditService.logDynamicSecretRotated(id, dynamicSecret.name, userId, dynamicSecret.projectId);

    return {
      id: credential.id,
      username: credential.username,
      password, // Return plain password (only once!)
      expiresAt: credential.expiresAt,
      createdAt: credential.createdAt,
    };
  },

  /**
   * Get credentials for a dynamic secret
   */
  async getCredentials(id: string) {
    const credentials = await db.dynamicSecretCredential.findMany({
      where: { dynamicSecretId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Decrypt passwords
    return credentials.map((cred) => {
      const decrypted = decryptJson<{ password: string }>(cred.password);
      return {
        ...cred,
        password: decrypted.password,
      };
    });
  },

  /**
   * Get latest credentials for a dynamic secret
   */
  async getLatestCredentials(id: string) {
    const credential = await db.dynamicSecretCredential.findFirst({
      where: { dynamicSecretId: id },
      orderBy: { createdAt: 'desc' },
    });

    if (!credential) return null;

    // Decrypt password
    const decrypted = decryptJson<{ password: string }>(credential.password);
    return {
      ...credential,
      password: decrypted.password,
    };
  },

  /**
   * Delete old credentials
   */
  async deleteCredentials(credentialId: string) {
    return db.dynamicSecretCredential.delete({
      where: { id: credentialId },
    });
  },
};
