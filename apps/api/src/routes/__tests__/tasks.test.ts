import request from 'supertest';
import app from '../../index';

// Mock the auth middleware
jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req: { userId: string }, res: unknown, next: () => void) => {
    req.userId = 'test-user-id';
    next();
  },
}));

// Mock supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    order: jest.fn().mockReturnThis(),
  },
}));

// Mock ProjectService
jest.mock('../../services/ProjectService', () => ({
  ProjectService: {
    getProjectById: jest.fn(),
  },
}));

// Mock SnapshotService
jest.mock('../../services/SnapshotService', () => ({
  SnapshotService: {
    getSnapshotById: jest.fn(),
  },
}));

// Mock TaskService
jest.mock('../../services/TaskService', () => ({
  TaskService: jest.fn().mockImplementation(() => ({
    generateTask: jest.fn().mockResolvedValue({
      markdown: '# Task: Test Feature\n\n## Goal\nImplement test feature',
      title: 'Test Feature',
    }),
  })),
}));

import { supabase } from '../../lib/supabase';
import { ProjectService } from '../../services/ProjectService';
import { SnapshotService } from '../../services/SnapshotService';

describe('Tasks Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/tasks', () => {
    const mockSnapshot = {
      id: 'snapshot-1',
      project_id: 'project-1',
      markdown: '# Architecture\n\nThis is the architecture...',
      created_at: new Date().toISOString(),
    };

    const mockProject = {
      id: 'project-1',
      user_id: 'test-user-id',
      repo_name: 'user/test-repo',
      installation_id: 'install-1',
      created_at: new Date().toISOString(),
    };

    const mockTask = {
      id: 'task-1',
      project_id: 'project-1',
      snapshot_id: 'snapshot-1',
      title: 'Test Feature',
      description: 'Add a test feature to the application',
      markdown: '# Task: Test Feature\n\n## Goal\nImplement test feature',
      created_at: new Date().toISOString(),
    };

    it('should generate a task successfully', async () => {
      (SnapshotService.getSnapshotById as jest.Mock).mockResolvedValue(mockSnapshot);
      (ProjectService.getProjectById as jest.Mock).mockResolvedValue(mockProject);
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockTask, error: null }),
          }),
        }),
      });

      const response = await request(app)
        .post('/api/tasks')
        .send({
          snapshotId: 'snapshot-1',
          description: 'Add a test feature to the application',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.task).toEqual(mockTask);
      expect(response.body.message).toBe('Task generated successfully');
    });

    it('should return 400 if snapshotId is missing', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          description: 'Add a feature',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Snapshot ID and description are required');
    });

    it('should return 400 if description is missing', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          snapshotId: 'snapshot-1',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Snapshot ID and description are required');
    });

    it('should return 400 if description is too short', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          snapshotId: 'snapshot-1',
          description: 'short',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Description must be at least 10 characters');
    });

    it('should return 404 if snapshot not found', async () => {
      (SnapshotService.getSnapshotById as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/tasks')
        .send({
          snapshotId: 'non-existent',
          description: 'Add a test feature to the application',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Snapshot not found');
    });

    it('should return 403 if user does not own the project', async () => {
      (SnapshotService.getSnapshotById as jest.Mock).mockResolvedValue(mockSnapshot);
      (ProjectService.getProjectById as jest.Mock).mockResolvedValue({
        ...mockProject,
        user_id: 'different-user',
      });

      const response = await request(app)
        .post('/api/tasks')
        .send({
          snapshotId: 'snapshot-1',
          description: 'Add a test feature to the application',
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied');
    });
  });

  describe('GET /api/tasks/:id', () => {
    const mockTask = {
      id: 'task-1',
      project_id: 'project-1',
      snapshot_id: 'snapshot-1',
      title: 'Test Feature',
      description: 'Add a test feature',
      markdown: '# Task: Test Feature',
      created_at: new Date().toISOString(),
    };

    const mockProject = {
      id: 'project-1',
      user_id: 'test-user-id',
      repo_name: 'user/test-repo',
    };

    it('should return a task by ID', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockTask, error: null }),
          }),
        }),
      });
      (ProjectService.getProjectById as jest.Mock).mockResolvedValue(mockProject);

      const response = await request(app).get('/api/tasks/task-1');

      expect(response.status).toBe(200);
      expect(response.body.task).toEqual(mockTask);
    });

    it('should return 404 if task not found', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          }),
        }),
      });

      const response = await request(app).get('/api/tasks/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Task not found');
    });

    it('should return 403 if user does not own the project', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockTask, error: null }),
          }),
        }),
      });
      (ProjectService.getProjectById as jest.Mock).mockResolvedValue({
        ...mockProject,
        user_id: 'different-user',
      });

      const response = await request(app).get('/api/tasks/task-1');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied');
    });
  });

  describe('GET /api/tasks/project/:projectId', () => {
    const mockTasks = [
      {
        id: 'task-1',
        project_id: 'project-1',
        title: 'Task 1',
        created_at: new Date().toISOString(),
      },
      {
        id: 'task-2',
        project_id: 'project-1',
        title: 'Task 2',
        created_at: new Date().toISOString(),
      },
    ];

    const mockProject = {
      id: 'project-1',
      user_id: 'test-user-id',
      repo_name: 'user/test-repo',
    };

    it('should return all tasks for a project', async () => {
      (ProjectService.getProjectById as jest.Mock).mockResolvedValue(mockProject);
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: mockTasks, error: null }),
          }),
        }),
      });

      const response = await request(app).get('/api/tasks/project/project-1');

      expect(response.status).toBe(200);
      expect(response.body.tasks).toEqual(mockTasks);
    });

    it('should return 404 if project not found', async () => {
      (ProjectService.getProjectById as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/api/tasks/project/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Project not found');
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    const mockTask = {
      id: 'task-1',
      project_id: 'project-1',
      title: 'Test Feature',
    };

    const mockProject = {
      id: 'project-1',
      user_id: 'test-user-id',
      repo_name: 'user/test-repo',
    };

    it('should delete a task successfully', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockTask, error: null }),
          }),
        }),
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });
      (ProjectService.getProjectById as jest.Mock).mockResolvedValue(mockProject);

      const response = await request(app).delete('/api/tasks/task-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Task deleted successfully');
    });

    it('should return 404 if task not found', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          }),
        }),
      });

      const response = await request(app).delete('/api/tasks/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Task not found');
    });
  });
});
