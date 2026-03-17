import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireOrgAccessBySlug, handleAuthError } from '@/backend/middleware/auth';
import { success, error } from '@/backend/utils/api-response';
import { z } from 'zod';

const updateMemberSchema = z.object({
  role: z.enum(['owner', 'admin', 'member']),
});

/**
 * PATCH /api/organizations/[slug]/members/[memberId] - Update member role
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; memberId: string }> }
) {
  try {
    const { slug, memberId } = await params;
    const { id: currentUserId, isOwner } = await requireOrgAccessBySlug(slug, 'admin');

    // Get organization to find member
    const organization = await db.organization.findUnique({
      where: { slug },
      include: {
        members: true,
      },
    });

    if (!organization) {
      return error('Organization not found', 404);
    }

    const member = organization.members.find((m) => m.id === memberId);
    if (!member) {
      return error('Member not found', 404);
    }

    // Can't change own role if you're the only owner
    if (member.role === 'owner' && member.userId === currentUserId) {
      return error('Cannot change your own owner role', 400);
    }

    // Only owners can assign owner role
    const body = await req.json();
    const { role } = updateMemberSchema.parse(body);

    if (role === 'owner' && !isOwner) {
      return error('Only owners can assign owner role', 403);
    }

    const updatedMember = await db.orgMember.update({
      where: { id: memberId },
      data: { role },
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
    });

    return success(updatedMember);
  } catch (err) {
    console.error('Update org member error:', err);
    const response = handleAuthError(err);
    if (response) return response;

    if (err instanceof z.ZodError) {
      return error(err.issues[0].message, 400);
    }
    return error('Internal server error', 500);
  }
}

/**
 * DELETE /api/organizations/[slug]/members/[memberId] - Remove member
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; memberId: string }> }
) {
  try {
    const { slug, memberId } = await params;
    const { id: currentUserId, isOwner } = await requireOrgAccessBySlug(slug, 'admin');

    // Get organization to find member
    const organization = await db.organization.findUnique({
      where: { slug },
      include: {
        members: true,
      },
    });

    if (!organization) {
      return error('Organization not found', 404);
    }

    const member = organization.members.find((m) => m.id === memberId);
    if (!member) {
      return error('Member not found', 404);
    }

    // Can't remove yourself
    if (member.userId === currentUserId) {
      return error('Cannot remove yourself', 400);
    }

    // Can't remove the only owner
    if (member.role === 'owner') {
      const ownerCount = organization.members.filter((m) => m.role === 'owner').length;
      if (ownerCount <= 1) {
        return error('Cannot remove the only owner', 400);
      }
    }

    // Non-owners can't remove owners
    if (member.role === 'owner' && !isOwner) {
      return error('Only owners can remove other owners', 403);
    }

    await db.orgMember.delete({
      where: { id: memberId },
    });

    return success({ success: true });
  } catch (err) {
    console.error('Remove org member error:', err);
    const response = handleAuthError(err);
    if (response) return response;
    return error('Internal server error', 500);
  }
}
