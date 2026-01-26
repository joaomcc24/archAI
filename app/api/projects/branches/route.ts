import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { RepoParserService } from '@/lib/services/RepoParserService';

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
