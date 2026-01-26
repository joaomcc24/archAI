import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { ProjectService } from '@/lib/services/ProjectService';
import { SnapshotService } from '@/lib/services/SnapshotService';
import { supabaseAdmin } from '@/lib/supabase-server';

export interface Task {
  id: string;
  project_id: string;
  snapshot_id: string;
  title: string;
  description: string;
  markdown: string;
  created_at: string;
}

// GET /api/tasks/snapshot/[snapshotId] - Get all tasks for a snapshot
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ snapshotId: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) return auth.error;

    const { snapshotId } = await params;

    // Verify snapshot ownership through project
    const snapshot = await SnapshotService.getSnapshotById(snapshotId);
    if (!snapshot) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
    }

    const project = await ProjectService.getProjectById(snapshot.project_id);
    if (!project || project.user_id !== auth.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('snapshot_id', snapshotId)
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
