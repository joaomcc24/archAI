import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { ProjectMembershipService } from '@/lib/services/ProjectMembershipService';
import { supabaseAdmin } from '@/lib/supabase-server';
import { formatErrorResponse } from '@/lib/errors';

// GET /api/invitations - list pending invitations for current user
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) {
      return auth.error;
    }

    const userEmail = auth.user.email?.toLowerCase().trim();
    if (!userEmail) {
      return NextResponse.json({ invitations: [] });
    }

    const invitations = await ProjectMembershipService.getPendingInvitationsForEmail(userEmail);
    const projectIds = invitations.map((inv) => inv.project_id);

    const projectNameById = new Map<string, string>();
    if (projectIds.length > 0) {
      const { data: projects, error } = await supabaseAdmin
        .from('projects')
        .select('id, repo_name')
        .in('id', projectIds);

      if (error) {
        throw new Error(`Failed to fetch invitation projects: ${error.message}`);
      }

      (projects || []).forEach((project) => {
        projectNameById.set(project.id, project.repo_name);
      });
    }

    return NextResponse.json({
      invitations: invitations.map((inv) => ({
        id: inv.id,
        token: inv.token,
        project_id: inv.project_id,
        project_name: projectNameById.get(inv.project_id) || 'Unknown project',
        email: inv.email,
        role: inv.role,
        expires_at: inv.expires_at,
        created_at: inv.created_at,
      })),
    });
  } catch (error) {
    const payload = formatErrorResponse(error);
    return NextResponse.json(payload, { status: 500 });
  }
}

