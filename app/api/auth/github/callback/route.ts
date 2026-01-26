import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) return auth.error;

    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Authorization code is required' }, { status: 400 });
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();
    const { access_token, error: tokenError, error_description } = tokenData;

    if (tokenError) {
      console.error('GitHub token error:', tokenError, error_description);
      return NextResponse.json(
        { error: error_description || 'Failed to obtain access token', code: tokenError },
        { status: 400 }
      );
    }

    if (!access_token) {
      return NextResponse.json({ error: 'Failed to obtain access token' }, { status: 400 });
    }

    // Fetch user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });
    const githubUser = await userResponse.json();

    // Fetch repositories
    const reposResponse = await fetch('https://api.github.com/user/repos?per_page=100', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });
    const repositories = await reposResponse.json();

    if (repositories.length === 0) {
      return NextResponse.json({ error: 'No repositories found' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      githubToken: access_token,
      githubUser: {
        id: githubUser.id,
        login: githubUser.login,
        name: githubUser.name,
        email: githubUser.email,
      },
      repositories: repositories.map((repo: GitHubRepo) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        private: repo.private,
      })),
    });
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process GitHub OAuth callback',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
