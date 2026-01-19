import request from 'supertest';

// Mock auth middleware to bypass authentication
jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.userId = 'test-user-id';
    req.user = { id: 'test-user-id', email: 'test@example.com' };
    next();
  },
}));

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
            id: 1,
            name: 'test-repo',
            full_name: 'testuser/test-repo',
            description: 'A test repo',
            private: false,
          },
        ],
      });

      const response = await request(app)
        .post('/api/auth/github/callback')
        .send({
          code: 'mock_code',
          state: 'mock_state',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.githubToken).toBe('mock_access_token');
      expect(response.body.githubUser.login).toBe('testuser');
      expect(response.body.repositories).toHaveLength(1);
      expect(response.body.repositories[0].full_name).toBe('testuser/test-repo');
    });

    it('should return error when authorization code is missing', async () => {
      const response = await request(app)
        .post('/api/auth/github/callback')
        .send({
          state: 'mock_state',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Authorization code is required');
    });

    it('should handle GitHub token errors gracefully', async () => {
      // Mock GitHub returning an error (e.g., code already used)
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          error: 'bad_verification_code',
          error_description: 'The code passed is incorrect or expired.',
        },
      });

      const response = await request(app)
        .post('/api/auth/github/callback')
        .send({
          code: 'expired_code',
          state: 'mock_state',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('The code passed is incorrect or expired.');
      expect(response.body.code).toBe('bad_verification_code');
    });

    it('should handle GitHub API errors', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('GitHub API error'));

      const response = await request(app)
        .post('/api/auth/github/callback')
        .send({
          code: 'mock_code',
          state: 'mock_state',
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to process GitHub OAuth callback');
    });

    it('should return error when no repositories found', async () => {
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

      // Mock empty repos
      mockedAxios.get.mockResolvedValueOnce({
        data: [],
      });

      const response = await request(app)
        .post('/api/auth/github/callback')
        .send({
          code: 'mock_code',
          state: 'mock_state',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No repositories found');
    });
  });
});
