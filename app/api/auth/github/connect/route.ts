import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { ProjectService } from '@/lib/services/ProjectService';

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) return auth.error;

    const { repoName, githubToken, branch } = await request.json();

    if (!repoName || !githubToken) {
      return NextResponse.json(
        { error: 'Repository name and GitHub token are required' },
        { status: 400 }
      );
    }

    // Get repo details
    const repoResponse = await fetch(`https://api.github.com/repos/${repoName}`, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
      },
    });
    const repo = await repoResponse.json();
    const installationId = repo.id.toString();

    // Use provided branch or default to repo's default branch
    const selectedBranch = branch || repo.default_branch;

    // Create project
    const project = await ProjectService.createProject(
      auth.user.id,
      repoName,
      installationId,
      githubToken,
      selectedBranch
    );

    return NextResponse.json({
      success: true,
      project,
    });
  } catch (error) {
    console.error('GitHub connect error:', error);
    return NextResponse.json(
      {
        error: 'Failed to connect repository',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
