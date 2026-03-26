import { NextRequest } from 'next/server';
import { requireProjectAdmin, handleAuthError } from '@/backend/middleware/auth';
import { success, handleZodError, error } from '@/backend/utils/api-response';
import { updateMemberSchema } from '@/backend/schemas';
import { memberService } from '@/backend/services';

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
    const data = updateMemberSchema.parse(body);

    const member = await memberService.updateMemberRole(
      projectId,
      memberId,
      data.roleId,
      user.id
    );

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
