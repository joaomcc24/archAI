import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from '../route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  authenticateRequest: vi.fn(),
}));

vi.mock('@/lib/services/ProjectService', () => ({
  ProjectService: {
    getProjectById: vi.fn(),
  },
}));

vi.mock('@/lib/services/SnapshotService', () => ({
  SnapshotService: {
    getLatestSnapshot: vi.fn(),
  },
}));

vi.mock('@/lib/services/RepoParserService', () => ({
  RepoParserService: vi.fn(),
}));

vi.mock('@/lib/services/DriftDetectionService', () => ({
  DriftDetectionService: vi.fn(),
}));

vi.mock('@/lib/services/LLMService', () => ({
  LLMService: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimiters: {
    llm: vi.fn(() => ({ allowed: true, remaining: 5, resetAt: Date.now() + 60000 })),
  },
}));

vi.mock('@/lib/analytics-server', () => ({
  trackServerEvent: vi.fn(),
  AnalyticsEvents: {
    DRIFT_DETECTED: 'drift_detected',
  },
}));

describe('Drift API Route', () => {
  const mockUserId = 'user-123';
  const mockProjectId = 'project-123';
  const mockSnapshotId = 'snapshot-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/projects/[id]/drift', () => {
    it('should return 401 if not authenticated', async () => {
      const { authenticateRequest } = await import('@/lib/auth');
      vi.mocked(authenticateRequest).mockResolvedValue({
        error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
      });

      const request = new NextRequest('http://localhost/api/projects/123/drift', {
        method: 'POST',
      });

      const response = await POST(request, { params: Promise.resolve({ id: mockProjectId }) });
      expect(response.status).toBe(401);
    });

    it('should return 404 if project not found', async () => {
      const { authenticateRequest } = await import('@/lib/auth');
      const { ProjectService } = await import('@/lib/services/ProjectService');

      vi.mocked(authenticateRequest).mockResolvedValue({
        user: { id: mockUserId },
      });
      vi.mocked(ProjectService.getProjectById).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/projects/123/drift', {
        method: 'POST',
      });

      const response = await POST(request, { params: Promise.resolve({ id: mockProjectId }) });
      expect(response.status).toBe(404);
    });

    it('should return 403 if user does not own project', async () => {
      const { authenticateRequest } = await import('@/lib/auth');
      const { ProjectService } = await import('@/lib/services/ProjectService');

      vi.mocked(authenticateRequest).mockResolvedValue({
        user: { id: 'other-user' },
      });
      vi.mocked(ProjectService.getProjectById).mockResolvedValue({
        id: mockProjectId,
        user_id: mockUserId,
        repo_name: 'test/repo',
        installation_id: 'install-123',
        github_token: 'token-123',
        created_at: new Date().toISOString(),
      });

      const request = new NextRequest('http://localhost/api/projects/123/drift', {
        method: 'POST',
      });

      const response = await POST(request, { params: Promise.resolve({ id: mockProjectId }) });
      expect(response.status).toBe(403);
    });

    it('should return 400 if no snapshots exist', async () => {
      const { authenticateRequest } = await import('@/lib/auth');
      const { ProjectService } = await import('@/lib/services/ProjectService');
      const { SnapshotService } = await import('@/lib/services/SnapshotService');

      vi.mocked(authenticateRequest).mockResolvedValue({
        user: { id: mockUserId },
      });
      vi.mocked(ProjectService.getProjectById).mockResolvedValue({
        id: mockProjectId,
        user_id: mockUserId,
        repo_name: 'test/repo',
        installation_id: 'install-123',
        github_token: 'token-123',
        created_at: new Date().toISOString(),
      });
      vi.mocked(SnapshotService.getLatestSnapshot).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/projects/123/drift', {
        method: 'POST',
      });

      const response = await POST(request, { params: Promise.resolve({ id: mockProjectId }) });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('No snapshots found');
    });

    it('should return 400 if GitHub token is missing', async () => {
      const { authenticateRequest } = await import('@/lib/auth');
      const { ProjectService } = await import('@/lib/services/ProjectService');

      vi.mocked(authenticateRequest).mockResolvedValue({
        user: { id: mockUserId },
      });
      vi.mocked(ProjectService.getProjectById).mockResolvedValue({
        id: mockProjectId,
        user_id: mockUserId,
        repo_name: 'test/repo',
        installation_id: 'install-123',
        github_token: undefined,
        created_at: new Date().toISOString(),
      });

      const request = new NextRequest('http://localhost/api/projects/123/drift', {
        method: 'POST',
      });

      const response = await POST(request, { params: Promise.resolve({ id: mockProjectId }) });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('GitHub token not found');
    });

    it('should successfully detect drift', async () => {
      const { authenticateRequest } = await import('@/lib/auth');
      const { ProjectService } = await import('@/lib/services/ProjectService');
      const { SnapshotService } = await import('@/lib/services/SnapshotService');
      const { RepoParserService } = await import('@/lib/services/RepoParserService');
      const { LLMService } = await import('@/lib/services/LLMService');
      const { DriftDetectionService } = await import('@/lib/services/DriftDetectionService');

      vi.mocked(authenticateRequest).mockResolvedValue({
        user: { id: mockUserId },
      });
      vi.mocked(ProjectService.getProjectById).mockResolvedValue({
        id: mockProjectId,
        user_id: mockUserId,
        repo_name: 'test/repo',
        installation_id: 'install-123',
        github_token: 'token-123',
        branch: 'main',
        created_at: new Date().toISOString(),
      });
      vi.mocked(SnapshotService.getLatestSnapshot).mockResolvedValue({
        id: mockSnapshotId,
        project_id: mockProjectId,
        markdown: '# Old Architecture',
        repo_structure: null,
        created_at: new Date().toISOString(),
      });

      const mockRepoParser = {
        fetchRepoTree: vi.fn().mockResolvedValue({ tree: [] }),
        normalizeRepoStructure: vi.fn().mockReturnValue({
          name: '',
          path: '',
          type: 'dir',
          children: [],
        }),
      };
      vi.mocked(RepoParserService).mockImplementation(() => mockRepoParser as any);

      const mockLLMService = {
        generateArchitectureMarkdown: vi.fn().mockResolvedValue('# New Architecture'),
      };
      vi.mocked(LLMService).mockImplementation(() => mockLLMService as any);

      const mockDriftService = {
        detectDrift: vi.fn().mockResolvedValue({
          id: 'drift-123',
          project_id: mockProjectId,
          snapshot_id: mockSnapshotId,
          file_changes: { added: [], removed: [], modified: [] },
          structure_diff: '',
          architecture_diff: '',
          drift_score: 10,
          status: 'completed',
          created_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        }),
      };
      vi.mocked(DriftDetectionService).mockImplementation(() => mockDriftService as any);

      const request = new NextRequest('http://localhost/api/projects/123/drift', {
        method: 'POST',
      });

      const response = await POST(request, { params: Promise.resolve({ id: mockProjectId }) });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.drift).toBeDefined();
      expect(data.drift.drift_score).toBe(10);
    });
  });

  describe('GET /api/projects/[id]/drift', () => {
    it('should return 401 if not authenticated', async () => {
      const { authenticateRequest } = await import('@/lib/auth');
      vi.mocked(authenticateRequest).mockResolvedValue({
        error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
      });

      const request = new NextRequest('http://localhost/api/projects/123/drift', {
        method: 'GET',
      });

      const response = await GET(request, { params: Promise.resolve({ id: mockProjectId }) });
      expect(response.status).toBe(401);
    });

    it('should return drift results for a project', async () => {
      const { authenticateRequest } = await import('@/lib/auth');
      const { ProjectService } = await import('@/lib/services/ProjectService');
      const { DriftDetectionService } = await import('@/lib/services/DriftDetectionService');

      vi.mocked(authenticateRequest).mockResolvedValue({
        user: { id: mockUserId },
      });
      vi.mocked(ProjectService.getProjectById).mockResolvedValue({
        id: mockProjectId,
        user_id: mockUserId,
        repo_name: 'test/repo',
        installation_id: 'install-123',
        github_token: 'token-123',
        created_at: new Date().toISOString(),
      });
      vi.mocked(DriftDetectionService.getDriftResultsByProjectId).mockResolvedValue([
        {
          id: 'drift-123',
          project_id: mockProjectId,
          snapshot_id: mockSnapshotId,
          current_repo_structure: null,
          previous_repo_structure: null,
          file_changes: { added: [], removed: [], modified: [] },
          structure_diff: '',
          architecture_diff: '',
          drift_score: 10,
          status: 'completed',
          created_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        },
      ]);

      const request = new NextRequest('http://localhost/api/projects/123/drift', {
        method: 'GET',
      });

      const response = await GET(request, { params: Promise.resolve({ id: mockProjectId }) });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.drift_results).toBeDefined();
      expect(data.drift_results.length).toBe(1);
    });
  });
});
