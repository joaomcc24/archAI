// @ts-nocheck

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
    getProjectsByUserId: jest.fn(),
    getProjectById: jest.fn(),
    deleteProject: jest.fn(),
  },
}));

jest.mock('../../services/SnapshotService', () => ({
  SnapshotService: {
    deleteSnapshotsByProjectId: jest.fn(),
  },
}));

// Import app after mocking
import app from '../../index';
import { ProjectService } from '../../services/ProjectService';
import { SnapshotService } from '../../services/SnapshotService';

const mockedProjectService = ProjectService as jest.Mocked<typeof ProjectService>;
const mockedSnapshotService = SnapshotService as jest.Mocked<typeof SnapshotService>;

describe('Projects Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/projects', () => {
    it('should fetch projects for a user successfully', async () => {
      const mockProjects = [
        {
          id: 'project-1',
          user_id: 'user-123',
          repo_name: 'testuser/repo1',
          installation_id: '111',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'project-2',
          user_id: 'user-123',
          repo_name: 'testuser/repo2',
          installation_id: '222',
          created_at: '2024-01-02T00:00:00Z',
        },
      ];

      mockedProjectService.getProjectsByUserId.mockResolvedValue(mockProjects);

      const response = await request(app)
        .get('/api/projects')
        .query({ userId: 'user-123' });

      expect(response.status).toBe(200);
      expect(response.body.projects).toEqual(mockProjects);
      expect(mockedProjectService.getProjectsByUserId).toHaveBeenCalledWith(
        'user-123'
      );
    });

    it('should return error when userId is missing', async () => {
      const response = await request(app).get('/api/projects');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('User ID is required');
      expect(mockedProjectService.getProjectsByUserId).not.toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      mockedProjectService.getProjectsByUserId.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get('/api/projects')
        .query({ userId: 'user-123' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch projects');
      expect(response.body.details).toBe('Database connection failed');
    });

    it('should return empty array when no projects found', async () => {
      mockedProjectService.getProjectsByUserId.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/projects')
        .query({ userId: 'user-123' });

      expect(response.status).toBe(200);
      expect(response.body.projects).toEqual([]);
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should fetch a project by ID successfully', async () => {
      const mockProject = {
        id: 'project-123',
        user_id: 'user-123',
        repo_name: 'testuser/test-repo',
        installation_id: '67890',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockedProjectService.getProjectById.mockResolvedValue(mockProject);

      const response = await request(app).get('/api/projects/project-123');

      expect(response.status).toBe(200);
      expect(response.body.project).toEqual(mockProject);
      expect(mockedProjectService.getProjectById).toHaveBeenCalledWith(
        'project-123'
      );
    });

    it('should return 404 when project not found', async () => {
      mockedProjectService.getProjectById.mockResolvedValue(null);

      const response = await request(app).get('/api/projects/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Project not found');
    });

    it('should handle service errors gracefully', async () => {
      mockedProjectService.getProjectById.mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app).get('/api/projects/project-123');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch project');
      expect(response.body.details).toBe('Database error');
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should delete a project successfully', async () => {
      const mockProject = {
        id: 'project-123',
        user_id: 'user-123',
        repo_name: 'testuser/test-repo',
        installation_id: '67890',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockedProjectService.getProjectById.mockResolvedValue(mockProject);
      mockedSnapshotService.deleteSnapshotsByProjectId.mockResolvedValue();
      mockedProjectService.deleteProject.mockResolvedValue();

      const response = await request(app).delete('/api/projects/project-123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockedProjectService.getProjectById).toHaveBeenCalledWith('project-123');
      expect(mockedSnapshotService.deleteSnapshotsByProjectId).toHaveBeenCalledWith(
        'project-123'
      );
      expect(mockedProjectService.deleteProject).toHaveBeenCalledWith('project-123');
    });

    it('should return 404 when project not found', async () => {
      mockedProjectService.getProjectById.mockResolvedValue(null);

      const response = await request(app).delete('/api/projects/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Project not found');
      expect(mockedSnapshotService.deleteSnapshotsByProjectId).not.toHaveBeenCalled();
      expect(mockedProjectService.deleteProject).not.toHaveBeenCalled();
    });

    it('should handle deletion errors gracefully', async () => {
      const mockProject = {
        id: 'project-123',
        user_id: 'user-123',
        repo_name: 'testuser/test-repo',
        installation_id: '67890',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockedProjectService.getProjectById.mockResolvedValue(mockProject);
      mockedSnapshotService.deleteSnapshotsByProjectId.mockResolvedValue();
      mockedProjectService.deleteProject.mockRejectedValue(
        new Error('Deletion failed')
      );

      const response = await request(app).delete('/api/projects/project-123');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to delete project');
      expect(response.body.details).toBe('Deletion failed');
    });
  });
});




