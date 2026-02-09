import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { formatErrorResponse, ExternalServiceError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) {
      return auth.error;
    }

    const userId = auth.user.id;
    const userEmail = auth.user.email;

    const errors: string[] = [];

    const { data: ownedProjects, error: ownedError } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('user_id', userId);

    if (ownedError) {
      errors.push(`projects: ${ownedError.message}`);
    }

    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('project_members')
      .select('*')
      .eq('user_id', userId);

    if (membershipError && membershipError.code !== 'PGRST205') {
      errors.push(`project_members: ${membershipError.message}`);
    }

    const sharedProjectIds =
      memberships?.filter((m) => m.role !== 'owner').map((m) => m.project_id) || [];

    const { data: sharedProjects, error: sharedError } = await supabaseAdmin
      .from('projects')
      .select('*')
      .in('id', sharedProjectIds.length > 0 ? sharedProjectIds : ['00000000-0000-0000-0000-000000000000']);

    if (sharedError && sharedProjectIds.length > 0) {
      errors.push(`shared_projects: ${sharedError.message}`);
    }

    const projects = [
      ...(ownedProjects || []),
      ...(sharedProjects || []).filter(
        (project) => !ownedProjects?.some((owned) => owned.id === project.id)
      ),
    ];

    const projectIds = projects.map((project) => project.id);

    const [{ data: snapshots, error: snapshotsError }, { data: tasks, error: tasksError }] = await Promise.all([
      projectIds.length > 0
        ? supabaseAdmin.from('snapshots').select('*').in('project_id', projectIds)
        : Promise.resolve({ data: [], error: null }),
      projectIds.length > 0
        ? supabaseAdmin.from('tasks').select('*').in('project_id', projectIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (snapshotsError) {
      errors.push(`snapshots: ${snapshotsError.message}`);
    }
    if (tasksError) {
      errors.push(`tasks: ${tasksError.message}`);
    }

    const { data: invitations, error: invitationsError } = await supabaseAdmin
      .from('project_invitations')
      .select('*')
      .or(`invited_by.eq.${userId},email.eq.${userEmail}`);

    if (invitationsError && invitationsError.code !== 'PGRST205') {
      errors.push(`project_invitations: ${invitationsError.message}`);
    }

    return NextResponse.json({
      exported_at: new Date().toISOString(),
      user: {
        id: userId,
        email: userEmail,
      },
      projects,
      snapshots: snapshots || [],
      tasks: tasks || [],
      memberships: memberships || [],
      invitations: invitations || [],
      errors,
    });
  } catch (error) {
    const payload = formatErrorResponse(error);
    return NextResponse.json(payload, { status: 500 });
  }
}
