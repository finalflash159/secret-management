import { db } from '../db';
import type { CreateOrganizationInput, UpdateOrganizationInput } from '../schemas';

/**
 * Organization service - handles organization CRUD
 */
export const organizationService = {
  /**
   * Get all organizations the user is a member of
   */
  async getOrganizations(userId: string) {
    return db.organization.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          where: {
            userId,
          },
        },
        _count: {
          select: {
            projects: true,
            members: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  /**
   * Get organization by slug
   */
  async getOrganizationBySlug(slug: string) {
    return db.organization.findUnique({
      where: { slug },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
              },
            },
          },
        },
        projects: {
          include: {
            environments: true,
            _count: {
              select: {
                secrets: true,
                folders: true,
              },
            },
          },
        },
        _count: {
          select: {
            projects: true,
            members: true,
          },
        },
      },
    });
  },

  /**
   * Create a new organization
   */
  async create(data: CreateOrganizationInput, userId: string) {
    // Check if slug already exists
    const existing = await db.organization.findUnique({
      where: { slug: data.slug },
    });

    if (existing) {
      throw new Error('Slug already taken');
    }

    // Create organization with the user as owner
    return db.organization.create({
      data: {
        name: data.name,
        slug: data.slug,
        members: {
          create: {
            userId,
            role: 'owner',
          },
        },
      },
      include: {
        members: true,
        _count: {
          select: {
            projects: true,
            members: true,
          },
        },
      },
    });
  },

  /**
   * Update an organization
   */
  async update(id: string, data: UpdateOrganizationInput) {
    return db.organization.update({
      where: { id },
      data,
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });
  },

  /**
   * Delete an organization
   */
  async delete(id: string) {
    await db.organization.delete({
      where: { id },
    });
    return { success: true };
  },
};
