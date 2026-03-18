import { db } from '@/lib/db';
import { dynamicSecretService } from './dynamic-secret.service';
import { isValidCronExpression, calculateNextRunTime } from '@/lib/cron-utils';

/**
 * Rotation service - handles automatic secret rotation
 */
export const rotationService = {
  /**
   * Get all rotation jobs for a project
   */
  async getByProject(projectId: string) {
    return db.rotationJob.findMany({
      where: {
        dynamicSecret: { projectId },
      },
      include: {
        dynamicSecret: true,
      },
      orderBy: { name: 'asc' },
    });
  },

  /**
   * Get rotation job by ID
   */
  async getById(id: string) {
    return db.rotationJob.findUnique({
      where: { id },
      include: {
        dynamicSecret: true,
      },
    });
  },

  /**
   * Create a rotation job
   */
  async create(
    data: {
      name: string;
      dynamicSecretId: string;
      cronExpression: string;
    }
  ) {
    // Verify the dynamic secret exists
    const dynamicSecret = await db.dynamicSecret.findUnique({
      where: { id: data.dynamicSecretId },
    });

    if (!dynamicSecret) {
      throw new Error('Dynamic secret not found');
    }

    // Check for existing job for this secret
    const existing = await db.rotationJob.findUnique({
      where: {
        dynamicSecretId: data.dynamicSecretId,
      },
    });

    if (existing) {
      throw new Error('Rotation job already exists for this dynamic secret');
    }

    // Validate cron expression
    if (!isValidCronExpression(data.cronExpression)) {
      throw new Error('Invalid cron expression');
    }

    // Calculate next run time
    const nextRunAt = calculateNextRunTime(data.cronExpression);

    const job = await db.rotationJob.create({
      data: {
        name: data.name,
        dynamicSecretId: data.dynamicSecretId,
        cronExpression: data.cronExpression,
        nextRunAt,
      },
      include: {
        dynamicSecret: true,
      },
    });

    return job;
  },

  /**
   * Update a rotation job
   */
  async update(
    id: string,
    data: {
      name?: string;
      cronExpression?: string;
      isActive?: boolean;
    }
  ) {
    const updateData: Record<string, unknown> = {};

    if (data.name) updateData.name = data.name;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.cronExpression) {
      if (!isValidCronExpression(data.cronExpression)) {
        throw new Error('Invalid cron expression');
      }
      updateData.cronExpression = data.cronExpression;
      // Recalculate next run
      updateData.nextRunAt = calculateNextRunTime(data.cronExpression);
    }

    return db.rotationJob.update({
      where: { id },
      data: updateData,
      include: {
        dynamicSecret: true,
      },
    });
  },

  /**
   * Delete a rotation job
   */
  async delete(id: string) {
    // Delete rotation logs first
    await db.rotationLog.deleteMany({
      where: { rotationJobId: id },
    });

    return db.rotationJob.delete({
      where: { id },
    });
  },

  /**
   * Manually trigger a rotation job
   */
  async runNow(id: string, userId: string) {
    const job = await db.rotationJob.findUnique({
      where: { id },
      include: {
        dynamicSecret: true,
      },
    });

    if (!job) {
      throw new Error('Rotation job not found');
    }

    try {
      // Generate new credentials
      const newCredential = await dynamicSecretService.generateCredentials(
        job.dynamicSecretId,
        userId
      );

      // Get the created credential from DB to get its ID
      const createdCredential = await db.dynamicSecretCredential.findFirst({
        where: { dynamicSecretId: job.dynamicSecretId },
        orderBy: { createdAt: 'desc' },
      });

      // Calculate next run time
      const nextRunAt = calculateNextRunTime(job.cronExpression);

      // Update job with last run time
      await db.rotationJob.update({
        where: { id },
        data: {
          lastRunAt: new Date(),
          nextRunAt,
        },
      });

      // Log the rotation
      await db.rotationLog.create({
        data: {
          rotationJobId: id,
          dynamicSecretId: job.dynamicSecretId,
          status: 'success',
          newCredentialId: createdCredential?.id,
          rotatedBy: 'manual',
        },
      });

      return { success: true, credential: newCredential };
    } catch (error) {
      // Log failed rotation
      await db.rotationLog.create({
        data: {
          dynamicSecretId: job.dynamicSecretId,
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          rotatedBy: 'manual',
        },
      });

      throw error;
    }
  },

  /**
   * Get rotation logs for a job
   */
  async getLogs(dynamicSecretId: string, limit: number = 10) {
    return db.rotationLog.findMany({
      where: { dynamicSecretId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  /**
   * Get jobs that need to run (for cron job)
   */
  async getJobsDueForRotation() {
    return db.rotationJob.findMany({
      where: {
        isActive: true,
        nextRunAt: {
          lte: new Date(),
        },
      },
      include: {
        dynamicSecret: true,
      },
    });
  },
};
