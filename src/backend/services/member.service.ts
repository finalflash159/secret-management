import { db } from '@/lib/db';
import { auditService } from './audit.service';
import { alertService } from './alert.service';
import type { AddMemberInput } from '@/backend/schemas';

/**
 * Member service - handles project member management
 */
export const memberService = {
  /**
   * Get all members of a project
   */
  async getMembers(projectId: string) {
    return db.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        role: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  },

  /**
   * Add a member to a project
   */
  async addMember(projectId: string, data: AddMemberInput, invitedByUserId: string) {
    // Find user by email
    const user = await db.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if user is already a member
    const existing = await db.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: user.id,
          projectId,
        },
      },
    });

    if (existing) {
      throw new Error('User is already a member');
    }

    // Verify role exists
    const role = await db.role.findUnique({
      where: { id: data.roleId },
    });

    if (!role || role.projectId !== projectId) {
      throw new Error('Invalid role');
    }

    const member = await db.projectMember.create({
      data: {
        userId: user.id,
        projectId,
        roleId: data.roleId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        role: true,
      },
    });

    // Log audit
    await auditService.logMemberAdded(
      member.id,
      user.email,
      role.name,
      invitedByUserId,
      projectId
    );

    // Get project info for alerts
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { orgId: true, name: true },
    });

    // Create alert for the new member (access granted)
    if (project) {
      await alertService.alertAccessGranted(
        user.id,
        project.orgId,
        project.name,
        role.name
      );
    }

    // Create alert for project owner (member added)
    const projectOwner = await db.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    });
    if (projectOwner && project) {
      await alertService.alertMemberAdded(
        projectOwner.ownerId,
        project.orgId,
        user.email,
        role.name
      );
    }

    return member;
  },

  /**
   * Update a member's role
   */
  async updateMemberRole(
    projectId: string,
    memberId: string,
    roleId: string,
    updatedByUserId: string
  ) {
    // Verify role exists
    const role = await db.role.findUnique({
      where: { id: roleId },
    });

    if (!role || role.projectId !== projectId) {
      throw new Error('Invalid role');
    }

    const member = await db.projectMember.findUnique({
      where: { id: memberId },
      include: { user: true },
    });

    if (!member) {
      throw new Error('Member not found');
    }

    const updated = await db.projectMember.update({
      where: { id: memberId },
      data: { roleId },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
        role: true,
      },
    });

    // Log audit
    await auditService.logMemberRoleUpdated(
      memberId,
      member.user.email,
      role.name,
      updatedByUserId,
      projectId
    );

    return updated;
  },

  /**
   * Remove a member from a project
   */
  async removeMember(projectId: string, memberId: string, removedByUserId: string) {
    const member = await db.projectMember.findUnique({
      where: { id: memberId },
      include: { user: true },
    });

    if (!member) {
      throw new Error('Member not found');
    }

    // Prevent removing owner (should be handled at API level)
    // But we check anyway
    const role = await db.role.findUnique({
      where: { id: member.roleId },
    });

    if (role?.slug === 'owner') {
      throw new Error('Cannot remove owner');
    }

    await db.projectMember.delete({
      where: { id: memberId },
    });

    // Log audit
    await auditService.logMemberRemoved(
      memberId,
      member.user.email,
      removedByUserId,
      projectId
    );

    // Get project info for alerts
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { orgId: true, name: true },
    });

    // Create alert for removed member (access revoked)
    if (project) {
      await alertService.alertAccessRevoked(
        member.user.id,
        project.orgId,
        project.name
      );
    }

    // Create alert for project owner (member removed)
    const projectOwner = await db.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    });
    if (projectOwner && project) {
      await alertService.alertMemberRemoved(
        projectOwner.ownerId,
        project.orgId,
        member.user.email
      );
    }

    return { success: true };
  },
};
