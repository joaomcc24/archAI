import request from 'supertest';

// Mock Supabase before importing app
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Mock ProjectService
jest.mock('../../services/ProjectService', () => ({
  ProjectService: {
    createProject: jest.fn(),
  },
}));

// Mock axios for GitHub API calls
jest.mock('axios');
const mockedAxios = require('axios');

// Import app after mocking
import app from '../../index';
import { ProjectService } from '../../services/ProjectService';

const mockedProjectService = ProjectService as jest.Mocked<typeof ProjectService>;

describe('GitHub OAuth Backend', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/github/callback', () => {
    it('should handle GitHub OAuth callback successfully', async () => {
      // Mock GitHub token exchange
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'mock_access_token',
        },
      });

      // Mock GitHub user API call
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          id: 12345,
          login: 'testuser',
          name: 'Test User',
          email: 'test@example.com',
        },
      });

      // Mock GitHub repos API call
      mockedAxios.get.mockResolvedValueOnce({
        data: [
          {
            id: 67890,
            name: 'test-repo',
            full_name: 'testuser/test-repo',
            description: 'A test repository',
            private: false,
          },
        ],
      });

      // Mock ProjectService.createProject
      mockedProjectService.createProject.mockResolvedValue({
        id: 'project-123',
        user_id: 'mock-user-id',
        repo_name: 'testuser/test-repo',
        installation_id: '67890',
        created_at: '2024-01-01T00:00:00Z',
      });

      const response = await request(app)
        .post('/api/auth/github/callback')
        .send({
          code: 'mock_auth_code',
          userId: 'mock-user-id',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.project).toBeDefined();
      expect(response.body.project.repo_name).toBe('testuser/test-repo');
      expect(response.body.project.installation_id).toBe('67890');
      expect(response.body.githubUser.login).toBe('testuser');
      expect(response.body.repositories).toHaveLength(1);
    });

    it('should return error when authorization code is missing', async () => {
      const response = await request(app)
        .post('/api/auth/github/callback')
        .send({
          userId: 'mock-user-id',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Authorization code is required');
    });

    it('should handle GitHub API errors', async () => {
      // Mock GitHub token exchange failure
      mockedAxios.post.mockRejectedValueOnce(new Error('GitHub API error'));

      const response = await request(app)
        .post('/api/auth/github/callback')
        .send({
          code: 'invalid_code',
          userId: 'mock-user-id',
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to process GitHub OAuth callback');
    });
  });

  describe('GET /api/auth/github/url', () => {
    it('should return GitHub OAuth URL', async () => {
      // Set environment variable for test
      process.env.GITHUB_CLIENT_ID = 'test_client_id';

      const response = await request(app).get('/api/auth/github/url');

      expect(response.status).toBe(200);
      expect(response.body.authUrl).toContain('github.com/login/oauth/authorize');
      expect(response.body.authUrl).toContain('client_id=test_client_id');
      expect(response.body.state).toBeDefined();
    });

    it('should return error when GitHub client ID is not configured', async () => {
      delete process.env.GITHUB_CLIENT_ID;

      const response = await request(app).get('/api/auth/github/url');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('GitHub client ID not configured');
    });
  });
});
