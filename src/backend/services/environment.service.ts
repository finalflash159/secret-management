import { db } from '@/lib/db';
import { auditService } from './audit.service';
import type { CreateEnvironmentInput } from '@/backend/schemas';

/**
 * Environment service - handles environment CRUD
 */
export const environmentService = {
  /**
   * Get all environments for a project
   */
  async getEnvironments(projectId: string) {
    return db.projectEnvironment.findMany({
      where: { projectId },
      orderBy: { slug: 'asc' },
    });
  },

  /**
   * Get an environment by ID
   */
  async getEnvironmentById(id: string) {
    return db.projectEnvironment.findUnique({
      where: { id },
    });
  },

  /**
   * Create a new environment
   */
  async create(data: CreateEnvironmentInput, projectId: string, userId: string) {
    // Check if slug already exists in project
    const existing = await db.projectEnvironment.findUnique({
      where: {
        projectId_slug: {
          projectId,
          slug: data.slug,
        },
      },
    });

    if (existing) {
      throw new Error('Environment slug already exists');
    }

    const environment = await db.projectEnvironment.create({
      data: {
        name: data.name,
        slug: data.slug,
        projectId,
      },
    });

    // Log audit
    await auditService.logEnvironmentCreated(environment.id, environment.name, userId, projectId);

    return environment;
  },

  /**
   * Delete an environment
   */
  async delete(id: string, userId: string) {
    const environment = await db.projectEnvironment.findUnique({
      where: { id },
    });

    if (!environment) {
      throw new Error('Environment not found');
    }

    const projectId = environment.projectId;
    const name = environment.name;

    // Delete all secrets in this environment first
    await db.secret.deleteMany({
      where: { envId: id },
    });

    // Delete the environment
    await db.projectEnvironment.delete({
      where: { id },
    });

    // Log audit
    await auditService.logEnvironmentDeleted(id, name, userId, projectId);

    return { success: true };
  },
};
