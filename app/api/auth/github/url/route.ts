import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json({ error: 'GitHub client ID not configured' }, { status: 500 });
  }

  const redirectUri = process.env.GITHUB_REDIRECT_URI;
  if (!redirectUri) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'GITHUB_REDIRECT_URI must be configured in production.' },
        { status: 500 }
      );
    }

    console.warn(
      'GITHUB_REDIRECT_URI is not set. Falling back to http://localhost:3000/auth/github/callback for GitHub OAuth.'
    );
  }

  const effectiveRedirectUri = redirectUri || 'http://localhost:3000/auth/github/callback';
  const state = Math.random().toString(36).substring(7);

  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    effectiveRedirectUri
  )}&scope=repo&state=${state}`;

  const response = NextResponse.json({ authUrl });
  response.cookies.set({
    name: 'gh_oauth_state',
    value: state,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60, // 10 minutes
    path: '/',
  });
  return response;
}
