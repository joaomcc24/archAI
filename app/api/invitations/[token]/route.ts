import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { ProjectMembershipService } from '@/lib/services/ProjectMembershipService';
import { ProjectService } from '@/lib/services/ProjectService';
import { formatErrorResponse } from '@/lib/errors';
import { trackServerEvent, AnalyticsEvents } from '@/lib/analytics-server';
import { captureException } from '@/lib/monitoring';

// GET /api/invitations/[token] - Get invitation details (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const invitation = await ProjectMembershipService.getInvitationByToken(token);

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 404 }
      );
    }

    // Get project details
    const project = await ProjectService.getProjectById(invitation.project_id);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get inviter details (just email for privacy)
    const { data: inviter } = await (await import('@/lib/supabase-server')).supabaseAdmin
      .from('project_members')
      .select('user_id')
      .eq('project_id', invitation.project_id)
      .eq('user_id', invitation.invited_by)
      .single();

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        project_id: invitation.project_id,
        project_name: project.repo_name,
        email: invitation.email,
        role: invitation.role,
        expires_at: invitation.expires_at,
      },
    });
  } catch (error) {
    console.error('Error fetching invitation:', error);
    void captureException(error);
    return NextResponse.json(
      formatErrorResponse(error),
      { status: error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 500 }
    );
  }
}

// POST /api/invitations/[token] - Accept invitation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) {
      return auth.error;
    }

    const { token } = await params;

    // Accept invitation
    const member = await ProjectMembershipService.acceptInvitation(token, auth.user.id);

    // Track analytics
    void trackServerEvent(AnalyticsEvents.INVITATION_ACCEPTED, {
      project_id: member.project_id,
      member_id: member.user_id,
      role: member.role,
    }, auth.user.id);

    return NextResponse.json({ member }, { status: 200 });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    void captureException(error);
    return NextResponse.json(
      formatErrorResponse(error),
      { status: error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 500 }
    );
  }
}
