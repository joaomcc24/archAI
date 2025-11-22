// @ts-nocheck

import { SnapshotService } from '../SnapshotService';

// Mock Supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockedSupabase = require('../../lib/supabase').supabase;

describe('SnapshotService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSnapshot', () => {
    it('should create a snapshot successfully', async () => {
      const mockSnapshot = {
        id: 'snapshot-123',
        project_id: 'project-123',
        markdown: '# Test Architecture\n\nThis is a test.',
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockSnapshot, error: null }),
      };

      mockedSupabase.from.mockReturnValue(mockQuery);

      const result = await SnapshotService.createSnapshot(
        'project-123',
        '# Test Architecture\n\nThis is a test.'
      );

      expect(result).toEqual(mockSnapshot);
      expect(mockedSupabase.from).toHaveBeenCalledWith('snapshots');
      expect(mockQuery.insert).toHaveBeenCalledWith({
        project_id: 'project-123',
        markdown: '# Test Architecture\n\nThis is a test.',
      });
    });

    it('should throw error when snapshot creation fails', async () => {
      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      mockedSupabase.from.mockReturnValue(mockQuery);

      await expect(
        SnapshotService.createSnapshot('project-123', '# Test Architecture')
      ).rejects.toThrow('Failed to create snapshot: Database error');
    });
  });

  describe('getSnapshotsByProjectId', () => {
    it('should fetch snapshots successfully', async () => {
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

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockSnapshots, error: null }),
      };

      mockedSupabase.from.mockReturnValue(mockQuery);

      const result = await SnapshotService.getSnapshotsByProjectId('project-123');

      expect(result).toEqual(mockSnapshots);
      expect(mockedSupabase.from).toHaveBeenCalledWith('snapshots');
      expect(mockQuery.eq).toHaveBeenCalledWith('project_id', 'project-123');
    });

    it('should return empty array when no snapshots found', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      mockedSupabase.from.mockReturnValue(mockQuery);

      const result = await SnapshotService.getSnapshotsByProjectId('project-123');

      expect(result).toEqual([]);
    });

    it('should throw descriptive error when snapshots table is missing', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: {
            message: "Could not find the table 'public.snapshots' in the schema cache",
          },
        }),
      };

      mockedSupabase.from.mockReturnValue(mockQuery as any);

      await expect(
        SnapshotService.getSnapshotsByProjectId('project-123')
      ).rejects.toThrow(
        'Snapshots table not found. Ensure the database migrations have been applied.'
      );
    });
  });

  describe('getLatestSnapshot', () => {
    it('should fetch latest snapshot successfully', async () => {
      const mockSnapshot = {
        id: 'snapshot-latest',
        project_id: 'project-123',
        markdown: '# Latest Architecture',
        created_at: '2024-01-02T00:00:00Z',
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockSnapshot, error: null }),
      };

      mockedSupabase.from.mockReturnValue(mockQuery);

      const result = await SnapshotService.getLatestSnapshot('project-123');

      expect(result).toEqual(mockSnapshot);
      expect(mockQuery.limit).toHaveBeenCalledWith(1);
    });

    it('should return null when no snapshots exist', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      };

      mockedSupabase.from.mockReturnValue(mockQuery);

      const result = await SnapshotService.getLatestSnapshot('project-123');

      expect(result).toBeNull();
    });
  });

  describe('getSnapshotById', () => {
    it('should fetch snapshot by ID successfully', async () => {
      const mockSnapshot = {
        id: 'snapshot-123',
        project_id: 'project-123',
        markdown: '# Test Architecture',
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockSnapshot, error: null }),
      };

      mockedSupabase.from.mockReturnValue(mockQuery);

      const result = await SnapshotService.getSnapshotById('snapshot-123');

      expect(result).toEqual(mockSnapshot);
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'snapshot-123');
    });

    it('should return null when snapshot not found', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      };

      mockedSupabase.from.mockReturnValue(mockQuery);

      const result = await SnapshotService.getSnapshotById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('deleteSnapshot', () => {
    it('should delete snapshot successfully', async () => {
      const mockQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      mockedSupabase.from.mockReturnValue(mockQuery);

      await SnapshotService.deleteSnapshot('snapshot-123');

      expect(mockedSupabase.from).toHaveBeenCalledWith('snapshots');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'snapshot-123');
    });

    it('should throw error when deletion fails', async () => {
      const mockQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: { message: 'Deletion failed' },
        }),
      };

      mockedSupabase.from.mockReturnValue(mockQuery);

      await expect(
        SnapshotService.deleteSnapshot('snapshot-123')
      ).rejects.toThrow('Failed to delete snapshot: Deletion failed');
    });
  });

  describe('deleteSnapshotsByProjectId', () => {
    it('should delete snapshots for a project successfully', async () => {
      const mockQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      mockedSupabase.from.mockReturnValue(mockQuery as any);

      await SnapshotService.deleteSnapshotsByProjectId('project-123');

      expect(mockedSupabase.from).toHaveBeenCalledWith('snapshots');
      expect(mockQuery.eq).toHaveBeenCalledWith('project_id', 'project-123');
    });

    it('should throw error when deletion fails', async () => {
      const mockQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: { message: 'Batch deletion failed' },
        }),
      };

      mockedSupabase.from.mockReturnValue(mockQuery as any);

      await expect(
        SnapshotService.deleteSnapshotsByProjectId('project-123')
      ).rejects.toThrow('Failed to delete project snapshots: Batch deletion failed');
    });
  });
});














