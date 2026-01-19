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

// Mock SnapshotService
jest.mock('../../services/SnapshotService', () => ({
  SnapshotService: {
    getSnapshotsByProjectId: jest.fn(),
    getSnapshotById: jest.fn(),
    getLatestSnapshot: jest.fn(),
  },
}));

// Mock ProjectService for ownership checks
jest.mock('../../services/ProjectService', () => ({
  ProjectService: {
    getProjectById: jest.fn(),
  },
}));

// Import app after mocking
import app from '../../index';
import { SnapshotService } from '../../services/SnapshotService';
import { ProjectService } from '../../services/ProjectService';

const mockedSnapshotService = SnapshotService as jest.Mocked<typeof SnapshotService>;
const mockedProjectService = ProjectService as jest.Mocked<typeof ProjectService>;

const mockProject = {
  id: 'project-123',
  user_id: 'test-user-id',
  repo_name: 'testuser/test-repo',
  installation_id: '12345',
  created_at: '2024-01-01T00:00:00Z',
};

describe('Snapshots Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: project exists and belongs to user
    mockedProjectService.getProjectById.mockResolvedValue(mockProject);
  });

  describe('GET /api/snapshots', () => {
    it('should fetch snapshots for a project successfully', async () => {
      const mockSnapshots = [
        {
          id: 'snapshot-1',
          project_id: 'project-123',
          content: '# Architecture',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'snapshot-2',
          project_id: 'project-123',
          content: '# Updated Architecture',
          created_at: '2024-01-02T00:00:00Z',
        },
      ];

      mockedSnapshotService.getSnapshotsByProjectId.mockResolvedValue(mockSnapshots);

      const response = await request(app)
        .get('/api/snapshots')
        .query({ projectId: 'project-123' });

      expect(response.status).toBe(200);
      expect(response.body.snapshots).toEqual(mockSnapshots);
      expect(mockedSnapshotService.getSnapshotsByProjectId).toHaveBeenCalledWith('project-123');
    });

    it('should return error when projectId is missing', async () => {
      const response = await request(app).get('/api/snapshots');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Project ID is required');
      expect(mockedSnapshotService.getSnapshotsByProjectId).not.toHaveBeenCalled();
    });

    it('should return 403 when user does not own the project', async () => {
      mockedProjectService.getProjectById.mockResolvedValue({
        ...mockProject,
        user_id: 'different-user-id',
      });

      const response = await request(app)
        .get('/api/snapshots')
        .query({ projectId: 'project-123' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied');
    });

    it('should handle service errors gracefully', async () => {
      mockedSnapshotService.getSnapshotsByProjectId.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get('/api/snapshots')
        .query({ projectId: 'project-123' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch snapshots');
      expect(response.body.details).toBe('Database connection failed');
    });

    it('should return empty array when no snapshots found', async () => {
      mockedSnapshotService.getSnapshotsByProjectId.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/snapshots')
        .query({ projectId: 'project-123' });

      expect(response.status).toBe(200);
      expect(response.body.snapshots).toEqual([]);
    });
  });

  describe('GET /api/snapshots/:id', () => {
    it('should fetch a snapshot by ID successfully', async () => {
      const mockSnapshot = {
        id: 'snapshot-123',
        project_id: 'project-123',
        content: '# Architecture',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockedSnapshotService.getSnapshotById.mockResolvedValue(mockSnapshot);

      const response = await request(app).get('/api/snapshots/snapshot-123');

      expect(response.status).toBe(200);
      expect(response.body.snapshot).toEqual(mockSnapshot);
      expect(mockedSnapshotService.getSnapshotById).toHaveBeenCalledWith('snapshot-123');
    });

    it('should return 404 when snapshot not found', async () => {
      mockedSnapshotService.getSnapshotById.mockResolvedValue(null);

      const response = await request(app).get('/api/snapshots/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Snapshot not found');
    });

    it('should handle service errors gracefully', async () => {
      mockedSnapshotService.getSnapshotById.mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app).get('/api/snapshots/snapshot-123');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch snapshot');
      expect(response.body.details).toBe('Database error');
    });
  });

  describe('GET /api/snapshots/project/:projectId/latest', () => {
    it('should fetch the latest snapshot for a project successfully', async () => {
      const mockSnapshot = {
        id: 'snapshot-latest',
        project_id: 'project-123',
        content: '# Latest Architecture',
        created_at: '2024-01-03T00:00:00Z',
      };

      mockedSnapshotService.getLatestSnapshot.mockResolvedValue(mockSnapshot);

      const response = await request(app).get('/api/snapshots/project/project-123/latest');

      expect(response.status).toBe(200);
      expect(response.body.snapshot).toEqual(mockSnapshot);
      expect(mockedSnapshotService.getLatestSnapshot).toHaveBeenCalledWith('project-123');
    });

    it('should return 404 when no snapshots exist for project', async () => {
      mockedSnapshotService.getLatestSnapshot.mockResolvedValue(null);

      const response = await request(app).get('/api/snapshots/project/project-123/latest');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('No snapshots found for this project');
    });

    it('should handle service errors gracefully', async () => {
      mockedSnapshotService.getLatestSnapshot.mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app).get('/api/snapshots/project/project-123/latest');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch latest snapshot');
      expect(response.body.details).toBe('Database error');
    });
  });
});
