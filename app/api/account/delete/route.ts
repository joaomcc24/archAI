import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { formatErrorResponse } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) {
      return auth.error;
    }

    const userId = auth.user.id;

    // Best-effort delete of user-related data before removing auth user
    const tablesWithUserId = ['projects', 'project_members', 'project_invitations'];

    for (const table of tablesWithUserId) {
      try {
        await supabaseAdmin.from(table).delete().eq('user_id', userId);
      } catch (err) {
        console.error(`Failed to delete from ${table} for user ${userId}:`, err);
      }
    }

    // Delete tasks and snapshots where user owns the project
    try {
      const { data: ownedProjects, error: projectsError } = await supabaseAdmin
        .from('projects')
        .select('id')
        .eq('user_id', userId);

      if (!projectsError && ownedProjects && ownedProjects.length > 0) {
        const projectIds = ownedProjects.map((p) => p.id);

        await supabaseAdmin.from('tasks').delete().in('project_id', projectIds);
        await supabaseAdmin.from('snapshots').delete().in('project_id', projectIds);
      }
    } catch (err) {
      console.error('Failed to delete tasks/snapshots for user projects:', err);
    }

    // Finally, delete the auth user
    try {
      const { auth: adminAuth } = supabaseAdmin;
      if (adminAuth && 'admin' in adminAuth) {
        // @ts-expect-error admin is available when using service role key
        const { error: deleteError } = await adminAuth.admin.deleteUser(userId);
        if (deleteError) {
          console.error('Failed to delete auth user:', deleteError);
          return NextResponse.json(
            { error: 'Failed to delete account. Please contact support.' },
            { status: 500 }
          );
        }
      } else {
        console.warn('Supabase admin auth API not available; user row not deleted from auth.');
      }
    } catch (err) {
      console.error('Unexpected error deleting auth user:', err);
      return NextResponse.json(
        { error: 'Failed to delete account. Please contact support.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in account delete handler:', error);
    const payload = formatErrorResponse(error);
    return NextResponse.json(payload, { status: 500 });
  }
}

