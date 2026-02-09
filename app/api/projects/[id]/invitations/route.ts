import { NextRequest, NextResponse } from 'next/server';
import { checkProjectOwner } from '@/lib/auth-project';
import { ProjectMembershipService } from '@/lib/services/ProjectMembershipService';
import { BillingService } from '@/lib/services/BillingService';
import { formatErrorResponse } from '@/lib/errors';
import { trackServerEvent, AnalyticsEvents } from '@/lib/analytics-server';
import { captureException } from '@/lib/monitoring';

// GET /api/projects/[id]/invitations - List pending invitations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    
    // Require owner access
    const owner = await checkProjectOwner(request, projectId);
    if ('error' in owner) {
      return owner.error;
    }

    const invitations = await ProjectMembershipService.getPendingInvitations(projectId);

    return NextResponse.json({ invitations });
  } catch (error) {
    console.error('Error fetching project invitations:', error);
    void captureException(error);
    return NextResponse.json(
      formatErrorResponse(error),
      { status: error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 500 }
    );
  }
}

// POST /api/projects/[id]/invitations - Create invitation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    
    // Require owner access
    const owner = await checkProjectOwner(request, projectId);
    if ('error' in owner) {
      return owner.error;
    }

    // Check if user has Team plan
    const billingService = new BillingService();
    const { plan } = await billingService.getSubscription(owner.id);
    if (plan.id !== 'team') {
      return NextResponse.json(
        { error: 'Team plan required to share projects' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, role } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!role || (role !== 'member' && role !== 'viewer')) {
      return NextResponse.json(
        { error: 'Role must be "member" or "viewer"' },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const userId = await ProjectMembershipService.getUserIdByEmail(email);
    if (userId) {
      const existingRole = await ProjectMembershipService.getUserRole(projectId, userId);
      if (existingRole) {
        return NextResponse.json(
          { error: 'User is already a member of this project' },
          { status: 400 }
        );
      }
    }

    // Create invitation
    const invitation = await ProjectMembershipService.createInvitation(
      projectId,
      email,
      role,
      owner.id
    );

    // Track analytics
    void trackServerEvent(AnalyticsEvents.INVITATION_SENT, {
      project_id: projectId,
      email,
      role,
    }, owner.id);

    return NextResponse.json({ invitation }, { status: 201 });
  } catch (error) {
    console.error('Error creating project invitation:', error);
    void captureException(error);
    return NextResponse.json(
      formatErrorResponse(error),
      { status: error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 500 }
    );
  }
}

// DELETE /api/projects/[id]/invitations - Revoke invitation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    
    // Require owner access
    const owner = await checkProjectOwner(request, projectId);
    if ('error' in owner) {
      return owner.error;
    }

    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get('invitationId');

    if (!invitationId) {
      return NextResponse.json(
        { error: 'invitationId query parameter is required' },
        { status: 400 }
      );
    }

    // Revoke invitation
    await ProjectMembershipService.revokeInvitation(invitationId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error revoking project invitation:', error);
    void captureException(error);
    return NextResponse.json(
      formatErrorResponse(error),
      { status: error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 500 }
    );
  }
}
