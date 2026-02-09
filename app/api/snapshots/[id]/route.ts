import { NextRequest, NextResponse } from 'next/server';
import { SnapshotService } from '@/lib/services/SnapshotService';
import { ProjectService } from '@/lib/services/ProjectService';
import { checkProjectAccess } from '@/lib/auth-project';

// GET /api/snapshots/[id] - Get a single snapshot
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const snapshot = await SnapshotService.getSnapshotById(id);

    if (!snapshot) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
    }

    const project = await ProjectService.getProjectById(snapshot.project_id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    const access = await checkProjectAccess(request, project.id, 'viewer');
    if ('error' in access) {
      return access.error;
    }

    return NextResponse.json({ snapshot });
  } catch (error) {
    console.error('Error fetching snapshot:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch snapshot',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
