import { NextRequest, NextResponse } from 'next/server';
import { SnapshotService } from '@/lib/services/SnapshotService';
import { ProjectService } from '@/lib/services/ProjectService';
import { checkProjectAccess } from '@/lib/auth-project';

// GET /api/snapshots/project/[projectId]/latest - Get latest snapshot for a project
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

    const snapshot = await SnapshotService.getLatestSnapshot(projectId);

    if (!snapshot) {
      return NextResponse.json({ error: 'No snapshots found for this project' }, { status: 404 });
    }

    return NextResponse.json({ snapshot });
  } catch (error) {
    console.error('Error fetching latest snapshot:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch latest snapshot',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
