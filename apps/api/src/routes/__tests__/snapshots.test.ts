import request from 'supertest';

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

// Import app after mocking
import app from '../../index';
import { SnapshotService } from '../../services/SnapshotService';

const mockedSnapshotService =
  SnapshotService as jest.Mocked<typeof SnapshotService>;

describe('Snapshots Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/snapshots', () => {
    it('should fetch snapshots for a project successfully', async () => {
      const mockSnapshots = [
        {
          id: 'snapshot-1',
          project_id: 'project-123',
          markdown: '# Architecture 1',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'snapshot-2',
          project_id: 'project-123',
          markdown: '# Architecture 2',
          created_at: '2024-01-02T00:00:00Z',
        },
      ];

      mockedSnapshotService.getSnapshotsByProjectId.mockResolvedValue(
        mockSnapshots
      );

      const response = await request(app)
        .get('/api/snapshots')
        .query({ projectId: 'project-123' });

      expect(response.status).toBe(200);
      expect(response.body.snapshots).toEqual(mockSnapshots);
      expect(
        mockedSnapshotService.getSnapshotsByProjectId
      ).toHaveBeenCalledWith('project-123');
    });

    it('should return error when projectId is missing', async () => {
      const response = await request(app).get('/api/snapshots');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Project ID is required');
      expect(
        mockedSnapshotService.getSnapshotsByProjectId
      ).not.toHaveBeenCalled();
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
        markdown: '# Test Architecture\n\nThis is a test.',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockedSnapshotService.getSnapshotById.mockResolvedValue(mockSnapshot);

      const response = await request(app).get('/api/snapshots/snapshot-123');

      expect(response.status).toBe(200);
      expect(response.body.snapshot).toEqual(mockSnapshot);
      expect(mockedSnapshotService.getSnapshotById).toHaveBeenCalledWith(
        'snapshot-123'
      );
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
        markdown: '# Latest Architecture',
        created_at: '2024-01-02T00:00:00Z',
      };

      mockedSnapshotService.getLatestSnapshot.mockResolvedValue(mockSnapshot);

      const response = await request(app).get(
        '/api/snapshots/project/project-123/latest'
      );

      expect(response.status).toBe(200);
      expect(response.body.snapshot).toEqual(mockSnapshot);
      expect(mockedSnapshotService.getLatestSnapshot).toHaveBeenCalledWith(
        'project-123'
      );
    });

    it('should return 404 when no snapshots exist for project', async () => {
      mockedSnapshotService.getLatestSnapshot.mockResolvedValue(null);

      const response = await request(app).get(
        '/api/snapshots/project/project-123/latest'
      );

      expect(response.status).toBe(404);
      expect(response.body.error).toBe(
        'No snapshots found for this project'
      );
    });

    it('should handle service errors gracefully', async () => {
      mockedSnapshotService.getLatestSnapshot.mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app).get(
        '/api/snapshots/project/project-123/latest'
      );

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch latest snapshot');
      expect(response.body.details).toBe('Database error');
    });
  });
});




