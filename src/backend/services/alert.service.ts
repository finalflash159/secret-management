import { db } from '@/lib/db';
import { AlertType } from '@prisma/client';

export type AlertTypeEnum = AlertType;

export interface CreateAlertData {
  userId: string;
  orgId?: string;
  projectId?: string;
  type: AlertType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export interface AlertFilters {
  userId: string;
  orgId?: string;
  projectId?: string;
  type?: AlertType;
  read?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Alert service - centralized notification system
 */
export const alertService = {
  /**
   * Create a new alert
   */
  async create(data: CreateAlertData) {
    return db.alert.create({
      data: {
        userId: data.userId,
        orgId: data.orgId,
        projectId: data.projectId,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link,
        metadata: data.metadata as object | undefined,
      },
    });
  },

  /**
   * Get alerts for a user with filters
   */
  async getAlerts(filters: AlertFilters) {
    const { userId, orgId, projectId, type, read, limit = 50, offset = 0 } = filters;

    const where: Record<string, unknown> = {
      userId,
    };

    if (projectId) {
      where.projectId = projectId;
    } else if (orgId) {
      where.orgId = orgId;
    }

    if (type) {
      where.type = type;
    }

    if (read !== undefined) {
      where.read = read;
    }

    const [alerts, total] = await Promise.all([
      db.alert.findMany({
        where,
        include: {
          org: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.alert.count({ where }),
    ]);

    return { alerts, total };
  },

  /**
   * Get unread alert count for a user
   */
  async getUnreadCount(userId: string, orgId?: string) {
    const where: Record<string, unknown> = {
      userId,
      read: false,
    };

    // Include alerts scoped to org if provided
    if (orgId) {
      where.orgId = orgId;
    }

    return db.alert.count({ where });
  },

  /**
   * Mark an alert as read
   */
  async markAsRead(alertId: string, userId: string) {
    return db.alert.updateMany({
      where: {
        id: alertId,
        userId,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  },

  /**
   * Mark all alerts as read for a user
   */
  async markAllAsRead(userId: string, orgId?: string) {
    const where: Record<string, unknown> = {
      userId,
      read: false,
    };

    if (orgId) {
      where.orgId = orgId;
    }

    return db.alert.updateMany({
      where,
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  },

  /**
   * Delete an alert
   */
  async delete(alertId: string, userId: string) {
    return db.alert.deleteMany({
      where: {
        id: alertId,
        userId,
      },
    });
  },

  /**
   * Delete old read alerts (cleanup)
   */
  async cleanupOldAlerts(userId: string, daysOld: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return db.alert.deleteMany({
      where: {
        userId,
        read: true,
        readAt: {
          lt: cutoffDate,
        },
      },
    });
  },

  // === Alert Factory Methods ===

  /**
   * Alert: Secret expiring soon
   */
  async alertSecretExpiring(
    userId: string,
    secretName: string,
    projectId: string,
    expiresAt: Date
  ) {
    const daysUntilExpiry = Math.ceil(
      (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    return this.create({
      userId,
      projectId,
      type: 'secret_expiry',
      title: 'Secret Expiring Soon',
      message: `Secret "${secretName}" will expire in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}`,
      link: `/organizations`,
      metadata: {
        secretName,
        expiresAt: expiresAt.toISOString(),
        daysUntilExpiry,
      },
    });
  },

  /**
   * Alert: Secret expired
   */
  async alertSecretExpired(
    userId: string,
    secretName: string,
    projectId: string
  ) {
    return this.create({
      userId,
      projectId,
      type: 'secret_expired',
      title: 'Secret Expired',
      message: `Secret "${secretName}" has expired and should be updated or rotated`,
      link: `/organizations`,
      metadata: {
        secretName,
      },
    });
  },

  /**
   * Alert: Member added to organization
   */
  async alertMemberAdded(
    userId: string,
    orgId: string,
    newMemberEmail: string,
    role: string
  ) {
    return this.create({
      userId,
      orgId,
      type: 'member_added',
      title: 'New Member Added',
      message: `${newMemberEmail} has been added to your organization as ${role}`,
      metadata: {
        newMemberEmail,
        role,
      },
    });
  },

  /**
   * Alert: Member removed from organization
   */
  async alertMemberRemoved(
    userId: string,
    orgId: string,
    removedMemberEmail: string
  ) {
    return this.create({
      userId,
      orgId,
      type: 'member_removed',
      title: 'Member Removed',
      message: `${removedMemberEmail} has been removed from your organization`,
      metadata: {
        removedMemberEmail,
      },
    });
  },

  /**
   * Alert: Access granted
   */
  async alertAccessGranted(
    userId: string,
    orgId: string,
    projectName: string,
    role: string
  ) {
    return this.create({
      userId,
      orgId,
      type: 'access_granted',
      title: 'Access Granted',
      message: `You have been granted ${role} access to project "${projectName}"`,
      metadata: {
        projectName,
        role,
      },
    });
  },

  /**
   * Alert: Access revoked
   */
  async alertAccessRevoked(
    userId: string,
    orgId: string,
    projectName: string
  ) {
    return this.create({
      userId,
      orgId,
      type: 'access_revoked',
      title: 'Access Revoked',
      message: `Your access to project "${projectName}" has been revoked`,
      metadata: {
        projectName,
      },
    });
  },

  /**
   * Alert: Security warning
   */
  async alertSecurityWarning(
    userId: string,
    orgId: string,
    title: string,
    message: string,
    metadata?: Record<string, unknown>
  ) {
    return this.create({
      userId,
      orgId,
      type: 'security',
      title,
      message,
      metadata,
    });
  },

  /**
   * Check and create expiry alerts for secrets
   * Should be called periodically (e.g., daily cron)
   */
  async checkSecretExpirations() {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Find secrets expiring within 7 days
    const expiringSecrets = await db.secret.findMany({
      where: {
        expiresAt: {
          gte: now,
          lte: sevenDaysFromNow,
        },
      },
      select: {
        id: true,
        key: true,
        projectId: true,
        project: {
          select: {
            ownerId: true,
            orgId: true,
            members: {
              select: {
                userId: true,
              },
            },
          },
        },
        expiresAt: true,
      },
    });

    // Create alerts for each secret
    for (const secret of expiringSecrets) {
      const userIds = [
        secret.project.ownerId,
        ...secret.project.members.map((m) => m.userId),
      ];

      // Avoid duplicate alerts
      const existingAlerts = await db.alert.findFirst({
        where: {
          userId: secret.project.ownerId,
          projectId: secret.projectId,
          type: 'secret_expiry',
          read: false,
          metadata: {
            path: ['secretName'],
            equals: secret.key,
          },
        },
      });

      if (!existingAlerts && secret.expiresAt) {
        const uniqueUserIds = Array.from(new Set(userIds));
        for (const userId of uniqueUserIds) {
          await this.alertSecretExpiring(
            userId,
            secret.key,
            secret.projectId,
            secret.expiresAt
          );
        }
      }
    }

    // Find expired secrets
    const expiredSecrets = await db.secret.findMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
      select: {
        id: true,
        key: true,
        projectId: true,
        project: {
          select: {
            ownerId: true,
            orgId: true,
            members: {
              select: {
                userId: true,
              },
            },
          },
        },
      },
    });

    // Create expired alerts
    for (const secret of expiredSecrets) {
      const userIds = [
        secret.project.ownerId,
        ...secret.project.members.map((m) => m.userId),
      ];

      const uniqueUserIds = Array.from(new Set(userIds));
      for (const userId of uniqueUserIds) {
        // Check for existing expired alert
        const existingAlert = await db.alert.findFirst({
          where: {
            userId,
            projectId: secret.projectId,
            type: 'secret_expired',
            read: false,
            metadata: {
              path: ['secretName'],
              equals: secret.key,
            },
          },
        });

        if (!existingAlert) {
          await this.alertSecretExpired(userId, secret.key, secret.projectId);
        }
      }
    }
  },
};
