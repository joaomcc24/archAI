import { NextRequest, NextResponse } from 'next/server';
import { checkProjectAccess, checkProjectOwner } from '@/lib/auth-project';
import { ProjectMembershipService } from '@/lib/services/ProjectMembershipService';
import { BillingService } from '@/lib/services/BillingService';
import { formatErrorResponse } from '@/lib/errors';
import { trackServerEvent, AnalyticsEvents } from '@/lib/analytics-server';
import { captureException } from '@/lib/monitoring';

// GET /api/projects/[id]/members - List all members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    
    // Require at least member access to view members
    const access = await checkProjectAccess(request, projectId, 'member');
    if ('error' in access) {
      return access.error;
    }

    const members = await ProjectMembershipService.getProjectMembers(projectId);

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Error fetching project members:', error);
    void captureException(error);
    return NextResponse.json(
      formatErrorResponse(error),
      { status: error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 500 }
    );
  }
}

// POST /api/projects/[id]/members - Add member directly by email
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

    // Get user ID by email
    const userId = await ProjectMembershipService.getUserIdByEmail(email);
    if (!userId) {
      return NextResponse.json(
        { error: 'User with this email not found' },
        { status: 404 }
      );
    }

    // Check if user is already a member
    const existingRole = await ProjectMembershipService.getUserRole(projectId, userId);
    if (existingRole) {
      return NextResponse.json(
        { error: 'User is already a member of this project' },
        { status: 400 }
      );
    }

    // Add member
    const member = await ProjectMembershipService.addMember(
      projectId,
      userId,
      role,
      owner.id
    );

    // Track analytics
    void trackServerEvent(AnalyticsEvents.MEMBER_ADDED, {
      project_id: projectId,
      member_id: userId,
      role,
    }, owner.id);

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    console.error('Error adding project member:', error);
    void captureException(error);
    return NextResponse.json(
      formatErrorResponse(error),
      { status: error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 500 }
    );
  }
}

// DELETE /api/projects/[id]/members - Remove member
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
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId query parameter is required' },
        { status: 400 }
      );
    }

    // Remove member
    await ProjectMembershipService.removeMember(projectId, userId);

    // Track analytics
    void trackServerEvent(AnalyticsEvents.MEMBER_REMOVED, {
      project_id: projectId,
      member_id: userId,
    }, owner.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing project member:', error);
    void captureException(error);
    return NextResponse.json(
      formatErrorResponse(error),
      { status: error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 500 }
    );
  }
}

// PATCH /api/projects/[id]/members - Update member role
export async function PATCH(
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

    const body = await request.json();
    const { userId, role } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    if (!role || (role !== 'member' && role !== 'viewer')) {
      return NextResponse.json(
        { error: 'Role must be "member" or "viewer"' },
        { status: 400 }
      );
    }

    // Update member role
    const member = await ProjectMembershipService.updateMemberRole(
      projectId,
      userId,
      role
    );

    // Track analytics
    void trackServerEvent(AnalyticsEvents.MEMBER_ROLE_UPDATED, {
      project_id: projectId,
      member_id: userId,
      new_role: role,
    }, owner.id);

    return NextResponse.json({ member });
  } catch (error) {
    console.error('Error updating project member role:', error);
    void captureException(error);
    return NextResponse.json(
      formatErrorResponse(error),
      { status: error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 500 }
    );
  }
}
