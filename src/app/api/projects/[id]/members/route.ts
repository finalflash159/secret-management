import { NextRequest } from 'next/server';
import { requireProjectAccess, requireProjectAdmin, handleAuthError } from '@/backend/middleware/auth';
import { success, handleZodError, error, notFound } from '@/backend/utils/api-response';
import { addMemberSchema } from '@/backend/schemas';
import { memberService } from '@/backend/services';

/**
 * GET /api/projects/[id]/members - List members
 * POST /api/projects/[id]/members - Add member
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    await requireProjectAccess(projectId, 'secret:read');

    const members = await memberService.getMembers(projectId);
    return success(members);
  } catch (err) {
    console.error('Get members error:', err);
    const response = handleAuthError(err);
    if (response) return response;
    return error('Internal server error', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { user } = await requireProjectAdmin(projectId);

    const body = await req.json();
    const data = addMemberSchema.parse(body);

    const member = await memberService.addMember(projectId, data, user.id);
    return success(member, 201);
  } catch (err) {
    console.error('Add member error:', err);
    const response = handleAuthError(err);
    if (response) return response;

    if (err instanceof Error) {
      if (err.message === 'User not found') {
        return notFound(err.message);
      }
      if (err.message.includes('already a member') || err.message === 'Invalid role') {
        return error(err.message, 400);
      }
    }
    return handleZodError(err);
  }
}

/**
 * PATCH /api/projects/[id]/members/[memberId] - Update member role
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id: projectId, memberId } = await params;
    const { user } = await requireProjectAdmin(projectId);

    const body = await req.json();
    const { roleId } = body;

    const member = await memberService.updateMemberRole(projectId, memberId, roleId, user.id);
    return success(member);
  } catch (err) {
    console.error('Update member error:', err);
    const response = handleAuthError(err);
    if (response) return response;

    if (err instanceof Error) {
      if (err.message === 'Member not found' || err.message === 'Invalid role') {
        return error(err.message, 400);
      }
    }
    return handleZodError(err);
  }
}

/**
 * DELETE /api/projects/[id]/members/[memberId] - Remove member
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id: projectId, memberId } = await params;
    const { user } = await requireProjectAdmin(projectId);

    await memberService.removeMember(projectId, memberId, user.id);
    return success({ success: true });
  } catch (err) {
    console.error('Remove member error:', err);
    const response = handleAuthError(err);
    if (response) return response;

    if (err instanceof Error) {
      if (err.message === 'Member not found' || err.message === 'Cannot remove owner') {
        return error(err.message, 400);
      }
    }
    return handleZodError(err);
  }
}