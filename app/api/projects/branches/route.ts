import { NextRequest, NextResponse } from 'next/server';
import { RepoParserService } from '@/lib/services/RepoParserService';

// POST /api/projects/branches - Fetch branches for a repository
export async function POST(request: NextRequest) {
  try {
    const auth = await (await import('@/lib/auth')).authenticateRequest(request);
    if ('error' in auth) return auth.error;

    const { repoName } = await request.json();
    const githubToken = request.cookies.get('gh_token')?.value;

    if (!repoName) {
      return NextResponse.json(
        { error: 'Repository name is required' },
        { status: 400 }
      );
    }
    if (!githubToken) {
      return NextResponse.json(
        { error: 'GitHub token not found. Please reconnect your repository.' },
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
