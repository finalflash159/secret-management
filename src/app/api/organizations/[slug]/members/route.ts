import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireOrgAccessBySlug, requireOrgOwner, handleAuthError } from '@/lib/api-auth';
import { success, error } from '@/lib/api-response';
import { alertService } from '@/lib/services';
import { z } from 'zod';

const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'member']).default('member'),
});

/**
 * GET /api/organizations/[slug]/members - List organization members
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // First get organization by slug to verify it exists
    const org = await db.organization.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!org) {
      return error('Organization not found', 404);
    }

    // Check access using org ID
    const { id: userId, email: userEmail, name: userName, orgId } = await requireOrgAccessBySlug(slug);

    const organization = await db.organization.findUnique({
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
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    return success(organization?.members || []);
  } catch (err) {
    console.error('Get org members error:', err);
    const response = handleAuthError(err);
    if (response) return response;
    return error('Internal server error', 500);
  }
}

/**
 * POST /api/organizations/[slug]/members - Invite a new member
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Verify organization exists
    const org = await db.organization.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!org) {
      return error('Organization not found', 404);
    }

    // Check access using slug directly
    const { id: currentUserId, email: currentUserEmail, name: currentUserName, orgId } = await requireOrgAccessBySlug(slug, 'admin');

    const body = await req.json();
    const { email, role } = inviteMemberSchema.parse(body);

    // Find user by email
    const invitee = await db.user.findUnique({
      where: { email },
    });

    if (!invitee) {
      return error('User not found. They must register first.', 404);
    }

    // Check if already a member
    const existingMember = await db.orgMember.findUnique({
      where: {
        userId_orgId: {
          userId: invitee.id,
          orgId,
        },
      },
    });

    if (existingMember) {
      return error('User is already a member of this organization', 400);
    }

    // Add member
    const member = await db.orgMember.create({
      data: {
        userId: invitee.id,
        orgId,
        role,
      },
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

    // Create alert for organization members
    await alertService.alertMemberAdded(currentUserId, orgId, email, role);

    return success(member, 201);
  } catch (err) {
    console.error('Invite org member error:', err);
    const response = handleAuthError(err);
    if (response) return response;

    if (err instanceof z.ZodError) {
      return error(err.issues[0].message, 400);
    }
    return error('Internal server error', 500);
  }
}

/**
 * DELETE /api/organizations/[slug]/members - Remove a member
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return error('Member ID is required', 400);
    }

    // Verify organization exists
    const org = await db.organization.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!org) {
      return error('Organization not found', 404);
    }

    // Check access using slug directly
    const { id: currentUserId, email: currentUserEmail, name: currentUserName, orgId } = await requireOrgAccessBySlug(slug, 'admin');

    // Find the member to be removed
    const member = await db.orgMember.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: { email: true },
        },
      },
    });

    if (!member) {
      return error('Member not found', 404);
    }

    if (member.orgId !== orgId) {
      return error('Member does not belong to this organization', 403);
    }

    // Prevent removing yourself (owner)
    if (member.userId === currentUserId) {
      return error('Cannot remove yourself from the organization', 400);
    }

    // Prevent removing the owner
    if (member.role === 'owner') {
      return error('Cannot remove the organization owner', 400);
    }

    // Remove member
    await db.orgMember.delete({
      where: { id: memberId },
    });

    // Create alert for organization owner
    await alertService.alertMemberRemoved(currentUserId, orgId, member.user.email);

    return success({ message: 'Member removed successfully' });
  } catch (err) {
    console.error('Remove org member error:', err);
    const response = handleAuthError(err);
    if (response) return response;
    return error('Internal server error', 500);
  }
}
