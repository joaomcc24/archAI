import { NextRequest, NextResponse } from 'next/server';
import { checkProjectAccess } from '@/lib/auth-project';
import { SnapshotService } from '@/lib/services/SnapshotService';
import { ProjectService } from '@/lib/services/ProjectService';
import { formatErrorResponse } from '@/lib/errors';

// GET /api/snapshots - Get snapshots for a project
export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Require at least viewer access
    const access = await checkProjectAccess(request, projectId, 'viewer');
    if ('error' in access) {
      return access.error;
    }

    const project = await ProjectService.getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const snapshots = await SnapshotService.getSnapshotsByProjectId(projectId);
    return NextResponse.json({ snapshots });
  } catch (error) {
    console.error('Error fetching snapshots:', error);
    return NextResponse.json(
      formatErrorResponse(error),
      { status: error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 500 }
    );
  }
}
