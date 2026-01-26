import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { SnapshotService } from '@/lib/services/SnapshotService';
import { ProjectService } from '@/lib/services/ProjectService';

// GET /api/snapshots/project/[projectId]/latest - Get latest snapshot for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) return auth.error;

    const { projectId } = await params;

    // Verify project belongs to user
    const project = await ProjectService.getProjectById(projectId);
    if (!project || project.user_id !== auth.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
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
