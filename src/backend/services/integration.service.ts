import { db } from '@/lib/db';
import { auditService } from './audit.service';
import { encryptJson, decryptJson } from '@/lib/encryption';

export interface CreateIntegrationInput {
  type: 'github' | 'aws' | 'gcp' | 'azure' | 'slack';
  name: string;
  config: {
    // GitHub
    accessToken?: string;
    repository?: string;
    // AWS
    accessKeyId?: string;
    secretAccessKey?: string;
    region?: string;
    // GCP
    projectId?: string;
    credentialsJson?: string;
    // Azure
    tenantId?: string;
    clientId?: string;
    clientSecret?: string;
    vaultName?: string;
    // Slack
    webhookUrl?: string;
    channel?: string;
  };
}

export interface UpdateIntegrationInput {
  name?: string;
  config?: CreateIntegrationInput['config'];
  isActive?: boolean;
}

/**
 * Integration service - handles external service connections
 */
export const integrationService = {
  /**
   * Get all integrations for an organization
   */
  async getByOrgId(orgId: string) {
    const integrations = await db.integration.findMany({
      where: { orgId },
      include: {
        _count: {
          select: { syncs: true },
        },
      },
      orderBy: { type: 'asc' },
    });

    // Return without decrypted config for list view (security)
    return integrations.map((integration) => ({
      id: integration.id,
      orgId: integration.orgId,
      type: integration.type,
      name: integration.name,
      isActive: integration.isActive,
      lastSyncAt: integration.lastSyncAt,
      createdAt: integration.createdAt,
      _count: integration._count,
      config: {}, // Don't expose config in list
    }));
  },

  /**
   * Get integration by ID
   */
  async getById(id: string) {
    const integration = await db.integration.findUnique({
      where: { id },
      include: {
        syncs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!integration) return null;

    // Return with decrypted config
    return {
      ...integration,
      config: integration.config ? decryptJson<CreateIntegrationInput['config']>(integration.config as string) : null,
    };
  },

  /**
   * Create a new integration
   */
  async create(orgId: string, userId: string, data: CreateIntegrationInput) {
    // Check for existing integration of same type
    const existing = await db.integration.findUnique({
      where: {
        orgId_type: {
          orgId,
          type: data.type,
        },
      },
    });

    if (existing) {
      throw new Error(`Integration of type ${data.type} already exists`);
    }

    // Encrypt config before storing
    const encryptedConfig = encryptJson(data.config);

    const integration = await db.integration.create({
      data: {
        orgId,
        type: data.type,
        name: data.name,
        config: encryptedConfig,
      },
    });

    // Log audit
    await auditService.log(
      'created',
      'integration',
      integration.id,
      userId,
      orgId,
      { type: data.type, name: data.name }
    );

    // Return with config for immediate use
    return {
      ...integration,
      config: data.config,
    };
  },

  /**
   * Update an integration
   */
  async update(id: string, data: UpdateIntegrationInput) {
    const updateData: Record<string, unknown> = {};
    let decryptedConfig: CreateIntegrationInput['config'] | undefined;

    if (data.name) updateData.name = data.name;
    if (data.config) {
      // Encrypt config before storing
      updateData.config = encryptJson(data.config);
      decryptedConfig = data.config;
    }
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updated = await db.integration.update({
      where: { id },
      data: updateData,
    });

    // Return with decrypted config
    return {
      ...updated,
      config: decryptedConfig || data.config,
    };
  },

  /**
   * Delete an integration
   */
  async delete(id: string, orgId: string, userId: string) {
    const integration = await db.integration.findUnique({
      where: { id },
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    // Delete sync history first
    await db.integrationSync.deleteMany({
      where: { integrationId: id },
    });

    await db.integration.delete({
      where: { id },
    });

    // Log audit
    await auditService.log(
      'deleted',
      'integration',
      id,
      userId,
      orgId,
      { type: integration.type, name: integration.name }
    );

    return { success: true };
  },

  /**
   * Test connection (placeholder - would need real implementation)
   */
  async testConnection(id: string) {
    const integration = await db.integration.findUnique({
      where: { id },
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    // Decrypt config to test connection
    if (!integration.config) {
      throw new Error('Integration config is missing');
    }
    const config = decryptJson<CreateIntegrationInput['config']>(integration.config as string);

    switch (integration.type) {
      case 'github':
        if (!config.accessToken) {
          throw new Error('Access token is required');
        }
        break;
      case 'aws':
        if (!config.accessKeyId || !config.secretAccessKey) {
          throw new Error('AWS credentials are required');
        }
        break;
      case 'slack':
        if (!config.webhookUrl) {
          throw new Error('Webhook URL is required');
        }
        break;
      default:
        throw new Error('Unsupported integration type');
    }

    return { success: true, message: 'Connection successful' };
  },

  /**
   * Record a sync attempt
   */
  async recordSync(
    integrationId: string,
    direction: 'push' | 'pull',
    status: 'success' | 'failed' | 'pending',
    secretsCount: number = 0,
    errorMessage?: string
  ) {
    return db.integrationSync.create({
      data: {
        integrationId,
        direction,
        status,
        secretsCount,
        errorMessage,
      },
    });
  },

  /**
   * Get sync history for an integration
   */
  async getSyncHistory(integrationId: string, limit: number = 10) {
    return db.integrationSync.findMany({
      where: { integrationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  /**
   * Get integration statistics
   */
  async getStats(orgId: string) {
    const [total, active, byType] = await Promise.all([
      db.integration.count({ where: { orgId } }),
      db.integration.count({ where: { orgId, isActive: true } }),
      db.integration.groupBy({
        by: ['type'],
        where: { orgId },
        _count: true,
      }),
    ]);

    return { total, active, byType };
  },
};
