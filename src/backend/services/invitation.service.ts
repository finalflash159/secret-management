import { db } from '@/lib/db';
import { RoleType, OrgInvitation, InvitationUse } from '@prisma/client';
import { randomBytes } from 'crypto';

const INVITE_CODE_LENGTH = 8;

export interface CreateInvitationInput {
  role: 'admin' | 'member';
  email?: string | null;
  maxUses?: number | null;
  expiresAt?: Date | null;
}

export interface InvitationWithDetails extends OrgInvitation {
  uses: InvitationUse[];
  _count?: {
    uses: number;
  };
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const bytes = randomBytes(INVITE_CODE_LENGTH);
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

export const invitationService = {
  /**
   * Create a new invitation
   */
  async create(
    orgId: string,
    createdBy: string,
    input: CreateInvitationInput
  ): Promise<OrgInvitation> {
    // Generate unique code
    let code: string;
    let attempts = 0;
    do {
      code = generateInviteCode();
      const existing = await db.orgInvitation.findUnique({ where: { code } });
      if (!existing) break;
      attempts++;
      if (attempts >= 10) {
        throw new Error('Failed to generate unique code');
      }
    } while (true);

    return db.orgInvitation.create({
      data: {
        orgId,
        code,
        role: input.role as RoleType,
        email: input.email || null,
        maxUses: input.maxUses || null,
        expiresAt: input.expiresAt || null,
        createdBy,
      },
    });
  },

  /**
   * Get all invitations for an organization
   */
  async getByOrgId(orgId: string): Promise<InvitationWithDetails[]> {
    return db.orgInvitation.findMany({
      where: { orgId },
      include: {
        uses: {
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
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Get invitation by ID
   */
  async getById(id: string): Promise<OrgInvitation | null> {
    return db.orgInvitation.findUnique({
      where: { id },
    });
  },

  /**
   * Get invitation by code
   */
  async getByCode(code: string): Promise<OrgInvitation | null> {
    return db.orgInvitation.findUnique({
      where: { code: code.toUpperCase() },
    });
  },

  /**
   * Validate invite code for registration
   */
  async validateForRegistration(
    code: string,
    email: string
  ): Promise<{ valid: boolean; error?: string; role?: RoleType; invitationId?: string; orgId?: string; createdBy?: string | null }> {
    const invitation = await this.getByCode(code);

    if (!invitation) {
      return { valid: false, error: 'Invalid invitation code' };
    }

    if (invitation.isRevoked) {
      return { valid: false, error: 'Invitation has been revoked' };
    }

    if (invitation.revokedAt) {
      return { valid: false, error: 'Invitation has been revoked' };
    }

    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      return { valid: false, error: 'Invitation has expired' };
    }

    if (invitation.maxUses && invitation.usedCount >= invitation.maxUses) {
      return { valid: false, error: 'Invitation has reached maximum uses' };
    }

    // Check email restriction
    if (invitation.email && invitation.email.toLowerCase() !== email.toLowerCase()) {
      return { valid: false, error: 'This invitation is for a different email address' };
    }

    return {
      valid: true,
      role: invitation.role,
      invitationId: invitation.id,
      orgId: invitation.orgId,
      createdBy: invitation.createdBy,
    };
  },

  /**
   * Mark invitation as used
   * @param invitationId - DB invitation ID (optional for master invite codes)
   * @param userId - user who used the invitation
   */
  async markAsUsed(invitationId: string | null, userId: string): Promise<void> {
    await db.$transaction(async (tx) => {
      await tx.invitationUse.create({
        data: {
          invitationId,
          userId,
        },
      });

      // Only increment usedCount if this is a real DB invitation
      if (invitationId) {
        await tx.orgInvitation.update({
          where: { id: invitationId },
          data: { usedCount: { increment: 1 } },
        });
      }
    });
  },

  /**
   * Revoke an invitation
   */
  async revoke(id: string): Promise<OrgInvitation> {
    return db.orgInvitation.update({
      where: { id },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  },

  /**
   * Regenerate invitation code
   */
  async regenerate(id: string): Promise<OrgInvitation> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error('Invitation not found');
    }

    // Generate new unique code
    let code: string;
    let attempts = 0;
    do {
      code = generateInviteCode();
      const existingCode = await db.orgInvitation.findUnique({ where: { code } });
      if (!existingCode) break;
      attempts++;
      if (attempts >= 10) {
        throw new Error('Failed to generate unique code');
      }
    } while (true);

    return db.orgInvitation.update({
      where: { id },
      data: {
        code,
        isRevoked: false,
        revokedAt: null,
        usedCount: 0,
      },
    });
  },

  /**
   * Delete an invitation
   */
  async delete(id: string): Promise<void> {
    await db.orgInvitation.delete({
      where: { id },
    });
  },

  /**
   * Get invitation statistics for an organization
   */
  async getStats(orgId: string): Promise<{
    total: number;
    active: number;
    used: number;
    expired: number;
    revoked: number;
  }> {
    const invitations = await db.orgInvitation.findMany({
      where: { orgId },
      select: {
        usedCount: true,
        maxUses: true,
        expiresAt: true,
        isRevoked: true,
        revokedAt: true,
      },
    });

    const now = new Date();
    return {
      total: invitations.length,
      active: invitations.filter((i) => {
        if (i.isRevoked || i.revokedAt) return false;
        if (i.expiresAt && i.expiresAt < now) return false;
        if (i.maxUses && i.usedCount >= i.maxUses) return false;
        return true;
      }).length,
      used: invitations.filter((i) => i.usedCount > 0).length,
      expired: invitations.filter((i) => i.expiresAt && i.expiresAt < now && !i.isRevoked).length,
      revoked: invitations.filter((i) => i.isRevoked).length,
    };
  },
};
