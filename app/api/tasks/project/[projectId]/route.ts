import { NextRequest, NextResponse } from 'next/server';
import { ProjectService } from '@/lib/services/ProjectService';
import { supabaseAdmin } from '@/lib/supabase-server';
import { checkProjectAccess } from '@/lib/auth-project';

export interface Task {
  id: string;
  project_id: string;
  snapshot_id: string;
  title: string;
  description: string;
  markdown: string;
  created_at: string;
}

// GET /api/tasks/project/[projectId] - Get all tasks for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    const project = await ProjectService.getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    const access = await checkProjectAccess(request, projectId, 'viewer');
    if ('error' in access) {
      return access.error;
    }

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch tasks');
    }

    return NextResponse.json({ tasks: data as Task[] });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch tasks',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
