import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectMembershipService } from '../ProjectMembershipService';

// Mock crypto
vi.mock('crypto', () => ({
  randomBytes: vi.fn(() => ({
    toString: () => 'mock-token-hex-string-1234567890abcdef',
  })),
}));

// Mock Supabase
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockFrom = vi.fn();

vi.mock('../../supabase-server', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: {
      admin: {
        getUserById: vi.fn(),
        listUsers: vi.fn(),
      },
    },
  },
}));

describe('ProjectMembershipService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProjectMembers', () => {
    it('should return all members of a project', async () => {
      const mockMembers = [
        { id: '1', project_id: 'proj-1', user_id: 'user-1', role: 'owner', created_at: '2026-01-01' },
        { id: '2', project_id: 'proj-1', user_id: 'user-2', role: 'member', created_at: '2026-01-02' },
      ];

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockMembers, error: null }),
          }),
        }),
      });

      const result = await ProjectMembershipService.getProjectMembers('proj-1');

      expect(result).toEqual(mockMembers);
      expect(mockFrom).toHaveBeenCalledWith('project_members');
    });

    it('should return empty array when no members exist', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const result = await ProjectMembershipService.getProjectMembers('proj-1');
      expect(result).toEqual([]);
    });

    it('should throw error on database failure', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'DB error' },
            }),
          }),
        }),
      });

      await expect(
        ProjectMembershipService.getProjectMembers('proj-1')
      ).rejects.toThrow('Failed to fetch project members: DB error');
    });
  });

  describe('getUserRole', () => {
    it('should return the user role for a project', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { role: 'member' },
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await ProjectMembershipService.getUserRole('proj-1', 'user-1');
      expect(result).toBe('member');
    });

    it('should return null when user is not a member', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116', message: 'Not found' },
              }),
            }),
          }),
        }),
      });

      const result = await ProjectMembershipService.getUserRole('proj-1', 'user-1');
      expect(result).toBeNull();
    });

    it('should throw error on unexpected database error', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'OTHER', message: 'Unexpected error' },
              }),
            }),
          }),
        }),
      });

      await expect(
        ProjectMembershipService.getUserRole('proj-1', 'user-1')
      ).rejects.toThrow('Failed to fetch user role: Unexpected error');
    });
  });

  describe('checkProjectAccess', () => {
    it('should return true when user has the required role', async () => {
      // Mock getUserRole to return 'owner'
      vi.spyOn(ProjectMembershipService, 'getUserRole').mockResolvedValue('owner');

      const result = await ProjectMembershipService.checkProjectAccess('proj-1', 'user-1', 'member');
      expect(result).toBe(true);
    });

    it('should return true when user has a higher role than required', async () => {
      vi.spyOn(ProjectMembershipService, 'getUserRole').mockResolvedValue('owner');

      const result = await ProjectMembershipService.checkProjectAccess('proj-1', 'user-1', 'viewer');
      expect(result).toBe(true);
    });

    it('should return false when user has a lower role than required', async () => {
      vi.spyOn(ProjectMembershipService, 'getUserRole').mockResolvedValue('viewer');

      const result = await ProjectMembershipService.checkProjectAccess('proj-1', 'user-1', 'member');
      expect(result).toBe(false);
    });

    it('should return false when user is not a member', async () => {
      vi.spyOn(ProjectMembershipService, 'getUserRole').mockResolvedValue(null);

      const result = await ProjectMembershipService.checkProjectAccess('proj-1', 'user-1', 'viewer');
      expect(result).toBe(false);
    });

    it('should allow exact role match', async () => {
      vi.spyOn(ProjectMembershipService, 'getUserRole').mockResolvedValue('member');

      const result = await ProjectMembershipService.checkProjectAccess('proj-1', 'user-1', 'member');
      expect(result).toBe(true);
    });
  });

  describe('addMember', () => {
    it('should add a member to a project', async () => {
      const mockMember = {
        id: '1',
        project_id: 'proj-1',
        user_id: 'user-2',
        role: 'member',
        invited_by: 'user-1',
      };

      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockMember, error: null }),
          }),
        }),
      });

      const result = await ProjectMembershipService.addMember('proj-1', 'user-2', 'member', 'user-1');
      expect(result).toEqual(mockMember);
    });

    it('should throw error when user is already a member', async () => {
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: '23505', message: 'duplicate key' },
            }),
          }),
        }),
      });

      await expect(
        ProjectMembershipService.addMember('proj-1', 'user-2', 'member', 'user-1')
      ).rejects.toThrow('User is already a member of this project');
    });
  });

  describe('removeMember', () => {
    it('should remove a member from a project', async () => {
      vi.spyOn(ProjectMembershipService, 'getUserRole').mockResolvedValue('member');

      mockFrom.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      });

      await expect(
        ProjectMembershipService.removeMember('proj-1', 'user-2')
      ).resolves.toBeUndefined();
    });

    it('should throw error when trying to remove project owner', async () => {
      vi.spyOn(ProjectMembershipService, 'getUserRole').mockResolvedValue('owner');

      await expect(
        ProjectMembershipService.removeMember('proj-1', 'user-1')
      ).rejects.toThrow('Cannot remove project owner');
    });
  });

  describe('updateMemberRole', () => {
    it('should update member role', async () => {
      vi.spyOn(ProjectMembershipService, 'getUserRole').mockResolvedValue('member');

      const updatedMember = {
        id: '1',
        project_id: 'proj-1',
        user_id: 'user-2',
        role: 'viewer',
      };

      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: updatedMember, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await ProjectMembershipService.updateMemberRole('proj-1', 'user-2', 'viewer');
      expect(result).toEqual(updatedMember);
    });

    it('should throw error when trying to change owner role', async () => {
      vi.spyOn(ProjectMembershipService, 'getUserRole').mockResolvedValue('owner');

      await expect(
        ProjectMembershipService.updateMemberRole('proj-1', 'user-1', 'viewer')
      ).rejects.toThrow('Cannot change owner role');
    });
  });

  describe('createInvitation', () => {
    it('should create an invitation with a token', async () => {
      const mockInvitation = {
        id: 'inv-1',
        project_id: 'proj-1',
        email: 'test@example.com',
        role: 'member',
        token: 'mock-token-hex-string-1234567890abcdef',
        invited_by: 'user-1',
      };

      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockInvitation, error: null }),
          }),
        }),
      });

      const result = await ProjectMembershipService.createInvitation(
        'proj-1', 'test@example.com', 'member', 'user-1'
      );

      expect(result).toEqual(mockInvitation);
      expect(result.token).toBeTruthy();
    });

    it('should throw error for duplicate invitation', async () => {
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: '23505', message: 'duplicate key' },
            }),
          }),
        }),
      });

      await expect(
        ProjectMembershipService.createInvitation('proj-1', 'test@example.com', 'member', 'user-1')
      ).rejects.toThrow('An invitation for this email already exists');
    });
  });

  describe('getInvitationByToken', () => {
    it('should return invitation for valid token', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const mockInvitation = {
        id: 'inv-1',
        project_id: 'proj-1',
        email: 'test@example.com',
        role: 'member',
        token: 'valid-token',
        expires_at: futureDate.toISOString(),
      };

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockInvitation, error: null }),
            }),
          }),
        }),
      });

      const result = await ProjectMembershipService.getInvitationByToken('valid-token');
      expect(result).toEqual(mockInvitation);
    });

    it('should return null for expired invitation', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const mockInvitation = {
        id: 'inv-1',
        token: 'expired-token',
        expires_at: pastDate.toISOString(),
      };

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockInvitation, error: null }),
            }),
          }),
        }),
      });

      const result = await ProjectMembershipService.getInvitationByToken('expired-token');
      expect(result).toBeNull();
    });

    it('should return null when token not found', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116', message: 'Not found' },
              }),
            }),
          }),
        }),
      });

      const result = await ProjectMembershipService.getInvitationByToken('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('revokeInvitation', () => {
    it('should revoke an invitation', async () => {
      mockFrom.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      await expect(
        ProjectMembershipService.revokeInvitation('inv-1')
      ).resolves.toBeUndefined();
    });

    it('should throw error on failure', async () => {
      mockFrom.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }),
        }),
      });

      await expect(
        ProjectMembershipService.revokeInvitation('inv-1')
      ).rejects.toThrow('Failed to revoke invitation: DB error');
    });
  });

  describe('getPendingInvitations', () => {
    it('should return pending invitations for a project', async () => {
      const mockInvitations = [
        { id: 'inv-1', project_id: 'proj-1', email: 'a@example.com', accepted_at: null },
        { id: 'inv-2', project_id: 'proj-1', email: 'b@example.com', accepted_at: null },
      ];

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: mockInvitations, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await ProjectMembershipService.getPendingInvitations('proj-1');
      expect(result).toEqual(mockInvitations);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no pending invitations', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await ProjectMembershipService.getPendingInvitations('proj-1');
      expect(result).toEqual([]);
    });
  });
});
