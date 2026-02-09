import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { checkProjectAccess, checkProjectOwner } from '../auth-project';

// Mock authenticateRequest
vi.mock('../auth', () => ({
  authenticateRequest: vi.fn(),
}));

// Mock ProjectMembershipService
vi.mock('../services/ProjectMembershipService', () => ({
  ProjectMembershipService: {
    getUserRole: vi.fn(),
  },
}));

// Mock errors module
vi.mock('../errors', () => ({
  NotFoundError: class extends Error {
    statusCode = 404;
    constructor(entity: string) {
      super(`${entity} not found`);
    }
  },
  AuthorizationError: class extends Error {
    statusCode = 403;
    constructor(message: string) {
      super(message);
    }
  },
}));

import { authenticateRequest } from '../auth';
import { ProjectMembershipService } from '../services/ProjectMembershipService';

function createMockRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/test', {
    headers: { Authorization: 'Bearer test-token' },
  });
}

describe('checkProjectAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return user and role when access is granted', async () => {
    vi.mocked(authenticateRequest).mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' },
    });
    vi.mocked(ProjectMembershipService.getUserRole).mockResolvedValue('owner');

    const result = await checkProjectAccess(createMockRequest(), 'proj-1', 'viewer');

    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.user.id).toBe('user-1');
      expect(result.role).toBe('owner');
    }
  });

  it('should return error when authentication fails', async () => {
    const { NextResponse } = await import('next/server');
    vi.mocked(authenticateRequest).mockResolvedValue({
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    });

    const result = await checkProjectAccess(createMockRequest(), 'proj-1', 'viewer');

    expect('error' in result).toBe(true);
  });

  it('should return 403 when user is not a member', async () => {
    vi.mocked(authenticateRequest).mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' },
    });
    vi.mocked(ProjectMembershipService.getUserRole).mockResolvedValue(null);

    const result = await checkProjectAccess(createMockRequest(), 'proj-1', 'viewer');

    expect('error' in result).toBe(true);
  });

  it('should return 403 when user has insufficient role', async () => {
    vi.mocked(authenticateRequest).mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' },
    });
    vi.mocked(ProjectMembershipService.getUserRole).mockResolvedValue('viewer');

    const result = await checkProjectAccess(createMockRequest(), 'proj-1', 'owner');

    expect('error' in result).toBe(true);
  });

  it('should allow member role to access viewer-level resources', async () => {
    vi.mocked(authenticateRequest).mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' },
    });
    vi.mocked(ProjectMembershipService.getUserRole).mockResolvedValue('member');

    const result = await checkProjectAccess(createMockRequest(), 'proj-1', 'viewer');

    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.role).toBe('member');
    }
  });

  it('should allow exact role match', async () => {
    vi.mocked(authenticateRequest).mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' },
    });
    vi.mocked(ProjectMembershipService.getUserRole).mockResolvedValue('member');

    const result = await checkProjectAccess(createMockRequest(), 'proj-1', 'member');

    expect('error' in result).toBe(false);
  });
});

describe('checkProjectOwner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return user when user is the owner', async () => {
    vi.mocked(authenticateRequest).mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' },
    });
    vi.mocked(ProjectMembershipService.getUserRole).mockResolvedValue('owner');

    const result = await checkProjectOwner(createMockRequest(), 'proj-1');

    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.id).toBe('user-1');
    }
  });

  it('should return error when user is not the owner', async () => {
    vi.mocked(authenticateRequest).mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' },
    });
    vi.mocked(ProjectMembershipService.getUserRole).mockResolvedValue('member');

    const result = await checkProjectOwner(createMockRequest(), 'proj-1');

    expect('error' in result).toBe(true);
  });
});
