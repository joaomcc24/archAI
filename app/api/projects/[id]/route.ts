import { NextRequest, NextResponse } from 'next/server';
import { checkProjectAccess, checkProjectOwner } from '@/lib/auth-project';
import { ProjectService } from '@/lib/services/ProjectService';
import { SnapshotService } from '@/lib/services/SnapshotService';
import { NotFoundError } from '@/lib/errors';
import { formatErrorResponse } from '@/lib/errors';

// GET /api/projects/[id] - Get a single project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Require at least viewer access
    const access = await checkProjectAccess(request, id, 'viewer');
    if ('error' in access) {
      return access.error;
    }

    const project = await ProjectService.getProjectById(id);

    if (!project) {
      const error = new NotFoundError('Project');
      return NextResponse.json(formatErrorResponse(error), { status: error.statusCode });
    }

    // Don't return github_token in response
    const { github_token, ...sanitizedProject } = project;
    return NextResponse.json({ project: sanitizedProject });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      formatErrorResponse(error),
      { status: error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 500 }
    );
  }
}

// DELETE /api/projects/[id] - Delete a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Require owner access
    const owner = await checkProjectOwner(request, id);
    if ('error' in owner) {
      return owner.error;
    }

    const project = await ProjectService.getProjectById(id);

    if (!project) {
      const error = new NotFoundError('Project');
      return NextResponse.json(formatErrorResponse(error), { status: error.statusCode });
    }

    await SnapshotService.deleteSnapshotsByProjectId(id);
    await ProjectService.deleteProject(id);

    return NextResponse.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      formatErrorResponse(error),
      { status: error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 500 }
    );
  }
}
