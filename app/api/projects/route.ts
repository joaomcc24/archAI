import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { ProjectService } from '@/lib/services/ProjectService';

// GET /api/projects - List all projects for user
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) return auth.error;

    // Get all projects (owned + shared)
    const projects = await ProjectService.getProjectsByUserId(auth.user.id, true);
    // Don't return github_token in response for security
    const sanitizedProjects = projects.map(({ github_token, ...project }) => project);

    return NextResponse.json({ projects: sanitizedProjects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch projects',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST /api/projects - Not supported
export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
