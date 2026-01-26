import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { ProjectService } from '@/lib/services/ProjectService';
import { RepoParserService } from '@/lib/services/RepoParserService';

// GET /api/projects - List all projects for user
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) return auth.error;

    const projects = await ProjectService.getProjectsByUserId(auth.user.id);
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

// POST /api/projects/branches - Fetch branches for a repository
export async function POST(request: NextRequest) {
  try {
    const { repoName, githubToken } = await request.json();

    if (!repoName || !githubToken) {
      return NextResponse.json(
        { error: 'Repository name and GitHub token are required' },
        { status: 400 }
      );
    }

    const repoParser = new RepoParserService();
    const branches = await repoParser.fetchBranches(repoName, githubToken);

    return NextResponse.json({ branches });
  } catch (error) {
    console.error('Error fetching branches:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch branches',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
