import { Router } from 'express';
import axios from 'axios';
import { ProjectService } from '../services/ProjectService';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

router.post('/github/callback', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { code, state } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    if (!req.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Exchange code for access token
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

    const { access_token, error: tokenError, error_description } = tokenResponse.data;

    // Handle GitHub OAuth errors (e.g., code already used)
    if (tokenError) {
      console.error('GitHub token error:', tokenError, error_description);
      return res.status(400).json({ 
        error: error_description || 'Failed to obtain access token',
        code: tokenError 
      });
    }

    if (!access_token) {
      return res.status(400).json({ error: 'Failed to obtain access token' });
    }

    // Fetch user info
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const githubUser = userResponse.data;

    // Fetch repositories
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

    // Return repositories for user to select, don't auto-create project
    res.json({
      success: true,
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

router.post('/github/connect', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { repoName, githubToken, branch } = req.body;

    if (!repoName || !githubToken) {
      return res.status(400).json({ error: 'Repository name and GitHub token are required' });
    }

    if (!req.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get repo details to get installation ID
    const repoResponse = await axios.get(
      `https://api.github.com/repos/${repoName}`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
        },
      }
    );

    const repo = repoResponse.data;
    const installationId = repo.id.toString();

    // Use provided branch or default to repo's default branch
    const selectedBranch = branch || repo.default_branch;

    // Create project with encrypted token storage
    const project = await ProjectService.createProject(
      req.userId,
      repoName,
      installationId,
      githubToken,
      selectedBranch
    );

    res.json({
      success: true,
      project,
    });
  } catch (error) {
    console.error('GitHub connect error:', error);
    res.status(500).json({
      error: 'Failed to connect repository',
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
