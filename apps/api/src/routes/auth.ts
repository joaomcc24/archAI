import { Router } from 'express';
import axios from 'axios';
import { ProjectService } from '../services/ProjectService';

const router = Router();

router.post('/github/callback', async (req, res) => {
  try {
    const { code, state } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    const { access_token } = tokenResponse.data;

    if (!access_token) {
      return res.status(400).json({ error: 'Failed to obtain access token' });
    }

    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const githubUser = userResponse.data;

    const reposResponse = await axios.get(
      `https://api.github.com/user/repos?per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    const repositories = reposResponse.data;

    if (repositories.length === 0) {
      return res.status(400).json({ error: 'No repositories found' });
    }

    const selectedRepo = repositories[0];
    const repoName = selectedRepo.full_name;
    const installationId = selectedRepo.id.toString(); // Using repo ID as installation ID for now

    const userId = req.body.userId || '00000000-0000-0000-0000-000000000001';

    const project = await ProjectService.createProject(
      userId,
      repoName,
      installationId
    );

    res.json({
      success: true,
      project,
  githubToken: access_token,
      githubUser: {
        id: githubUser.id,
        login: githubUser.login,
        name: githubUser.name,
        email: githubUser.email,
      },
      repositories: repositories.map((repo: any) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        private: repo.private,
      })),
    });
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    res.status(500).json({
      error: 'Failed to process GitHub OAuth callback',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/github/url', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  
  if (!clientId) {
    return res.status(500).json({ error: 'GitHub client ID not configured' });
  }

  const redirectUri = process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/auth/github/callback';
  const state = Math.random().toString(36).substring(7);
  
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo&state=${state}`;
  
  res.json({ authUrl, state });
});

export { router as authRoutes };
