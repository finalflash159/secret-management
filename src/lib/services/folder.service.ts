import { db } from '../db';
import { auditService } from './audit.service';
import type { CreateFolderInput, UpdateFolderInput, ListFoldersQuery } from '../schemas';

/**
 * Folder service - handles folder CRUD
 */
export const folderService = {
  /**
   * Get all folders for a project
   */
  async getFolders(projectId: string, query: ListFoldersQuery = {}) {
    const where: Record<string, unknown> = { projectId };

    if (query.envId) where.envId = query.envId;

    return db.folder.findMany({
      where,
      include: {
        children: true,
        parent: true,
      },
      orderBy: { name: 'asc' },
    });
  },

  /**
   * Get a folder by ID
   */
  async getFolderById(id: string) {
    return db.folder.findUnique({
      where: { id },
      include: {
        children: true,
        parent: true,
        secrets: true,
      },
    });
  },

  /**
   * Create a new folder
   */
  async create(data: CreateFolderInput, userId: string, projectId: string) {
    // Validate parent folder if provided
    if (data.parentId) {
      const parent = await db.folder.findUnique({
        where: { id: data.parentId },
      });

      if (!parent || parent.projectId !== projectId || parent.envId !== data.envId) {
        throw new Error('Invalid parent folder');
      }
    }

    // Check for duplicate folder name in same parent/env
    const existing = await db.folder.findFirst({
      where: {
        projectId,
        envId: data.envId,
        parentId: data.parentId || null,
        name: data.name,
      },
    });

    if (existing) {
      throw new Error('Folder already exists in this location');
    }

    const folder = await db.folder.create({
      data: {
        name: data.name,
        projectId,
        envId: data.envId,
        parentId: data.parentId,
      },
      include: {
        parent: true,
        children: true,
      },
    });

    // Log audit
    await auditService.logFolderCreated(folder.id, folder.name, userId, projectId);

    return folder;
  },

  /**
   * Update a folder
   */
  async update(id: string, data: UpdateFolderInput) {
    // If moving to new parent, validate
    if (data.parentId !== undefined && data.parentId !== null) {
      const parent = await db.folder.findUnique({
        where: { id: data.parentId },
      });

      if (!parent) {
        throw new Error('Parent folder not found');
      }
    }

    return db.folder.update({
      where: { id },
      data: {
        name: data.name,
        parentId: data.parentId,
      },
      include: {
        parent: true,
        children: true,
      },
    });
  },

  /**
   * Delete a folder
   */
  async delete(id: string, userId: string) {
    const folder = await db.folder.findUnique({
      where: { id },
    });

    if (!folder) {
      throw new Error('Folder not found');
    }

    const projectId = folder.projectId;
    const name = folder.name;

    // Delete all secrets in this folder first
    await db.secret.deleteMany({
      where: { folderId: id },
    });

    // Delete the folder
    await db.folder.delete({
      where: { id },
    });

    // Log audit
    await auditService.logFolderDeleted(id, name, userId, projectId);

    return { success: true };
  },
};
