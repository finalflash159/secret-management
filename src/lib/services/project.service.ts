import { db } from '../db';
import { DEFAULT_PERMISSIONS } from '../permissions';
import type { CreateProjectInput, UpdateProjectInput } from '../schemas';

/**
 * Project service - handles project CRUD and member management
 */
export const projectService = {
  /**
   * Get all projects the user has access to
   */
  async getProjects(userId: string, orgId?: string) {
    const where = orgId
      ? {
          orgId,
          OR: [
            { ownerId: userId },
            { members: { some: { userId } } },
          ],
        }
      : {
          OR: [
            { ownerId: userId },
            { members: { some: { userId } } },
          ],
        };

    return db.project.findMany({
      where,
      include: {
        org: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        environments: true,
        _count: {
          select: {
            secrets: true,
            folders: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Get a project by ID
   */
  async getProjectById(id: string) {
    return db.project.findUnique({
      where: { id },
      include: {
        org: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        environments: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            role: true,
          },
        },
        roles: true,
        _count: {
          select: {
            secrets: true,
            folders: true,
            members: true,
          },
        },
      },
    });
  },

  /**
   * Create a new project
   */
  async create(data: CreateProjectInput, userId: string) {
    // Check if user is a member of the org
    const orgMember = await db.orgMember.findUnique({
      where: {
        userId_orgId: {
          userId: userId,
          orgId: data.orgId,
        },
      },
    });

    if (!orgMember) {
      throw new Error('Not a member of this organization');
    }

    // Check if slug already exists in the org
    const existingProject = await db.project.findUnique({
      where: {
        orgId_slug: {
          orgId: data.orgId,
          slug: data.slug,
        },
      },
    });

    if (existingProject) {
      throw new Error('Project slug already exists in this organization');
    }

    // Default environments
    const defaultEnvs = data.environments || [
      { name: 'Development', slug: 'dev' },
      { name: 'Staging', slug: 'staging' },
      { name: 'Production', slug: 'prod' },
    ];

    // Create project with default roles
    const project = await db.project.create({
      data: {
        name: data.name,
        slug: data.slug,
        orgId: data.orgId,
        ownerId: userId,
        environments: {
          create: defaultEnvs,
        },
        roles: {
          create: [
            {
              name: 'Admin',
              slug: 'admin',
              permissions: JSON.stringify(DEFAULT_PERMISSIONS.admin),
              isDefault: false,
            },
            {
              name: 'Editor',
              slug: 'editor',
              permissions: JSON.stringify(DEFAULT_PERMISSIONS.editor),
              isDefault: false,
            },
            {
              name: 'Viewer',
              slug: 'viewer',
              permissions: JSON.stringify(DEFAULT_PERMISSIONS.viewer),
              isDefault: true,
            },
          ],
        },
      },
      include: {
        environments: true,
        org: true,
      },
    });

    // Add owner as admin member
    const adminRole = await db.role.findFirst({
      where: {
        projectId: project.id,
        slug: 'admin',
      },
    });

    if (adminRole) {
      await db.projectMember.create({
        data: {
          userId,
          projectId: project.id,
          roleId: adminRole.id,
        },
      });
    }

    return project;
  },

  /**
   * Update a project
   */
  async update(id: string, data: UpdateProjectInput) {
    return db.project.update({
      where: { id },
      data,
      include: {
        environments: true,
        org: true,
      },
    });
  },

  /**
   * Delete a project
   */
  async delete(id: string, userId: string) {
    const project = await db.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Check ownership - owner can always delete
    const isOwner = project.ownerId === userId;

    if (!isOwner) {
      throw new Error('Only owner can delete project');
    }

    await db.project.delete({
      where: { id },
    });

    return { success: true };
  },

  /**
   * Get project roles
   */
  async getRoles(projectId: string) {
    return db.role.findMany({
      where: { projectId },
      orderBy: { slug: 'asc' },
    });
  },
};
