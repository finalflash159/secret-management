import { db } from '@/lib/db';

export type AuditAction = 'created' | 'updated' | 'deleted' | 'viewed' | 'exported';
export type AuditTargetType = 'secret' | 'folder' | 'project' | 'member' | 'environment' | 'role' | 'organization';

/**
 * Audit service - centralized audit logging
 */
export const auditService = {
  /**
   * Log an audit entry
   */
  async log(
    action: AuditAction,
    targetType: AuditTargetType,
    targetId: string,
    userId: string,
    projectId: string,
    metadata?: Record<string, unknown>
  ) {
    return db.auditLog.create({
      data: {
        action,
        targetType,
        targetId,
        userId,
        projectId,
        metadata: metadata as object | undefined,
      },
    });
  },

  /**
   * Log secret created
   */
  async logSecretCreated(secretId: string, key: string, userId: string, projectId: string) {
    return this.log('created', 'secret', secretId, userId, projectId, { key });
  },

  /**
   * Log secret updated
   */
  async logSecretUpdated(secretId: string, key: string, userId: string, projectId: string) {
    return this.log('updated', 'secret', secretId, userId, projectId, { key });
  },

  /**
   * Log secret deleted
   */
  async logSecretDeleted(secretId: string, key: string, userId: string, projectId: string) {
    return this.log('deleted', 'secret', secretId, userId, projectId, { key });
  },

  /**
   * Log secret viewed
   */
  async logSecretViewed(secretId: string, key: string, userId: string, projectId: string) {
    return this.log('viewed', 'secret', secretId, userId, projectId, { key });
  },

  /**
   * Log folder created
   */
  async logFolderCreated(folderId: string, name: string, userId: string, projectId: string) {
    return this.log('created', 'folder', folderId, userId, projectId, { name });
  },

  /**
   * Log folder deleted
   */
  async logFolderDeleted(folderId: string, name: string, userId: string, projectId: string) {
    return this.log('deleted', 'folder', folderId, userId, projectId, { name });
  },

  /**
   * Log member added
   */
  async logMemberAdded(
    memberId: string,
    memberEmail: string,
    role: string,
    userId: string,
    projectId: string
  ) {
    return this.log('created', 'member', memberId, userId, projectId, {
      memberEmail,
      role,
    });
  },

  /**
   * Log member removed
   */
  async logMemberRemoved(
    memberId: string,
    memberEmail: string,
    userId: string,
    projectId: string
  ) {
    return this.log('deleted', 'member', memberId, userId, projectId, {
      memberEmail,
    });
  },

  /**
   * Log member role updated
   */
  async logMemberRoleUpdated(
    memberId: string,
    memberEmail: string,
    newRole: string,
    userId: string,
    projectId: string
  ) {
    return this.log('updated', 'member', memberId, userId, projectId, {
      memberEmail,
      newRole,
    });
  },

  /**
   * Log environment created
   */
  async logEnvironmentCreated(
    envId: string,
    name: string,
    userId: string,
    projectId: string
  ) {
    return this.log('created', 'environment', envId, userId, projectId, { name });
  },

  /**
   * Log environment deleted
   */
  async logEnvironmentDeleted(
    envId: string,
    name: string,
    userId: string,
    projectId: string
  ) {
    return this.log('deleted', 'environment', envId, userId, projectId, { name });
  },

  /**
   * Get audit logs for a project
   */
  async getLogs(
    projectId: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ) {
    const { limit = 50, offset = 0 } = options;

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where: { projectId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.auditLog.count({ where: { projectId } }),
    ]);

    return { logs, total };
  },

  /**
   * Get audit logs for a specific secret
   */
  async getSecretLogs(secretId: string, options: { limit?: number } = {}) {
    const { limit = 10 } = options;

    return db.auditLog.findMany({
      where: {
        targetType: 'secret',
        targetId: secretId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },
};
