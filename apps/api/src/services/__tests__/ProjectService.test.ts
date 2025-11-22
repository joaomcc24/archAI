// @ts-nocheck

import { ProjectService } from '../../services/ProjectService';
import { supabase } from '../../lib/supabase';

// Mock Supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockedSupabase = supabase as jest.Mocked<typeof supabase>;

describe('ProjectService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createProject', () => {
    it('should create a project successfully', async () => {
      const mockProject = {
        id: 'project-123',
        user_id: 'user-123',
        repo_name: 'testuser/test-repo',
        installation_id: '67890',
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockProject, error: null }),
      };

      mockedSupabase.from.mockReturnValue(mockQuery as any);

      const result = await ProjectService.createProject(
        'user-123',
        'testuser/test-repo',
        '67890'
      );

      expect(result).toEqual(mockProject);
      expect(mockedSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockQuery.insert).toHaveBeenCalledWith({
        user_id: 'user-123',
        repo_name: 'testuser/test-repo',
        installation_id: '67890',
      });
    });

    it('should throw error when project creation fails', async () => {
      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      mockedSupabase.from.mockReturnValue(mockQuery as any);

      await expect(
        ProjectService.createProject('user-123', 'testuser/test-repo', '67890')
      ).rejects.toThrow('Failed to create project: Database error');
    });
  });

  describe('getProjectsByUserId', () => {
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

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockProjects, error: null }),
      };

      mockedSupabase.from.mockReturnValue(mockQuery as any);

      const result = await ProjectService.getProjectsByUserId('user-123');

      expect(result).toEqual(mockProjects);
      expect(mockedSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-123');
    });

    it('should return empty array when no projects found', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      mockedSupabase.from.mockReturnValue(mockQuery as any);

      const result = await ProjectService.getProjectsByUserId('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('getProjectById', () => {
    it('should fetch a project by ID successfully', async () => {
      const mockProject = {
        id: 'project-123',
        user_id: 'user-123',
        repo_name: 'testuser/test-repo',
        installation_id: '67890',
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockProject, error: null }),
      };

      mockedSupabase.from.mockReturnValue(mockQuery as any);

      const result = await ProjectService.getProjectById('project-123');

      expect(result).toEqual(mockProject);
      expect(mockedSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'project-123');
    });

    it('should return null when project not found', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      };

      mockedSupabase.from.mockReturnValue(mockQuery as any);

      const result = await ProjectService.getProjectById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('deleteProject', () => {
    it('should delete a project successfully', async () => {
      const mockQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      mockedSupabase.from.mockReturnValue(mockQuery as any);

      await ProjectService.deleteProject('project-123');

      expect(mockedSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'project-123');
    });

    it('should throw error when deletion fails', async () => {
      const mockQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: { message: 'Deletion failed' },
        }),
      };

      mockedSupabase.from.mockReturnValue(mockQuery as any);

      await expect(ProjectService.deleteProject('project-123')).rejects.toThrow(
        'Failed to delete project: Deletion failed'
      );
    });
  });
});
