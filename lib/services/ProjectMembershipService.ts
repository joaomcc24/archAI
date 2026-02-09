import { supabaseAdmin as supabase } from '../supabase-server';
import { randomBytes } from 'crypto';

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: 'owner' | 'member' | 'viewer';
  invited_by: string | null;
  invited_at: string;
  joined_at: string | null;
  created_at: string;
}

export interface ProjectInvitation {
  id: string;
  project_id: string;
  email: string;
  role: 'member' | 'viewer';
  token: string;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export class ProjectMembershipService {
  /**
   * Get all members of a project
   */
  static async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
    const { data, error } = await supabase
      .from('project_members')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch project members: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get user's role in a project
   */
  static async getUserRole(
    projectId: string,
    userId: string
  ): Promise<'owner' | 'member' | 'viewer' | null> {
    const { data, error } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch user role: ${error.message}`);
    }

    return data?.role || null;
  }

  /**
   * Check if user has required access level
   */
  static async checkProjectAccess(
    projectId: string,
    userId: string,
    requiredRole: 'owner' | 'member' | 'viewer'
  ): Promise<boolean> {
    const userRole = await this.getUserRole(projectId, userId);
    
    if (!userRole) {
      return false;
    }

    const roleHierarchy: Record<string, number> = {
      owner: 3,
      member: 2,
      viewer: 1,
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }

  /**
   * Add a member to a project
   */
  static async addMember(
    projectId: string,
    userId: string,
    role: 'member' | 'viewer',
    invitedBy: string
  ): Promise<ProjectMember> {
    const { data, error } = await supabase
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id: userId,
        role,
        invited_by: invitedBy,
        invited_at: new Date().toISOString(),
        joined_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('User is already a member of this project');
      }
      throw new Error(`Failed to add member: ${error.message}`);
    }

    return data;
  }

  /**
   * Remove a member from a project
   */
  static async removeMember(projectId: string, userId: string): Promise<void> {
    // Check if user is owner - owners cannot be removed
    const role = await this.getUserRole(projectId, userId);
    if (role === 'owner') {
      throw new Error('Cannot remove project owner');
    }

    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to remove member: ${error.message}`);
    }
  }

  /**
   * Update member role
   */
  static async updateMemberRole(
    projectId: string,
    userId: string,
    newRole: 'member' | 'viewer'
  ): Promise<ProjectMember> {
    // Cannot change owner role
    const currentRole = await this.getUserRole(projectId, userId);
    if (currentRole === 'owner') {
      throw new Error('Cannot change owner role');
    }

    const { data, error } = await supabase
      .from('project_members')
      .update({ role: newRole })
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update member role: ${error.message}`);
    }

    return data;
  }

  /**
   * Create an invitation
   */
  static async createInvitation(
    projectId: string,
    email: string,
    role: 'member' | 'viewer',
    invitedBy: string
  ): Promise<ProjectInvitation> {
    // Generate secure token
    const token = randomBytes(32).toString('hex');

    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data, error } = await supabase
      .from('project_invitations')
      .insert({
        project_id: projectId,
        email: email.toLowerCase().trim(),
        role,
        token,
        invited_by: invitedBy,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('An invitation for this email already exists');
      }
      throw new Error(`Failed to create invitation: ${error.message}`);
    }

    return data;
  }

  /**
   * Get invitation by token
   */
  static async getInvitationByToken(token: string): Promise<ProjectInvitation | null> {
    const { data, error } = await supabase
      .from('project_invitations')
      .select('*')
      .eq('token', token)
      .is('accepted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch invitation: ${error.message}`);
    }

    // Check if invitation is expired
    if (data && new Date(data.expires_at) < new Date()) {
      return null;
    }

    return data;
  }

  /**
   * Accept an invitation
   */
  static async acceptInvitation(token: string, userId: string): Promise<ProjectMember> {
    const invitation = await this.getInvitationByToken(token);
    
    if (!invitation) {
      throw new Error('Invalid or expired invitation');
    }

    // Get user email from auth.users
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !user.user) {
      throw new Error('User not found');
    }

    const userEmail = user.user.email?.toLowerCase().trim();
    if (userEmail !== invitation.email.toLowerCase().trim()) {
      throw new Error('Invitation email does not match user email');
    }

    // Check if user is already a member
    const existingRole = await this.getUserRole(invitation.project_id, userId);
    if (existingRole) {
      throw new Error('User is already a member of this project');
    }

    // Start transaction: mark invitation as accepted and add member
    const { data: member, error: memberError } = await supabase
      .from('project_members')
      .insert({
        project_id: invitation.project_id,
        user_id: userId,
        role: invitation.role,
        invited_by: invitation.invited_by,
        invited_at: invitation.created_at,
        joined_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (memberError) {
      throw new Error(`Failed to add member: ${memberError.message}`);
    }

    // Mark invitation as accepted
    const { error: updateError } = await supabase
      .from('project_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id);

    if (updateError) {
      // Rollback: remove member if invitation update fails
      await supabase
        .from('project_members')
        .delete()
        .eq('id', member.id);
      throw new Error(`Failed to accept invitation: ${updateError.message}`);
    }

    return member;
  }

  /**
   * Revoke an invitation
   */
  static async revokeInvitation(invitationId: string): Promise<void> {
    const { error } = await supabase
      .from('project_invitations')
      .delete()
      .eq('id', invitationId);

    if (error) {
      throw new Error(`Failed to revoke invitation: ${error.message}`);
    }
  }

  /**
   * Get pending invitations for a project
   */
  static async getPendingInvitations(projectId: string): Promise<ProjectInvitation[]> {
    const { data, error } = await supabase
      .from('project_invitations')
      .select('*')
      .eq('project_id', projectId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch invitations: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get user ID by email (for adding members directly)
   */
  static async getUserIdByEmail(email: string): Promise<string | null> {
    const normalizedEmail = email.toLowerCase().trim();
    const perPage = 1000;
    let page = 1;

    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) {
        throw new Error(`Failed to fetch users: ${error.message}`);
      }

      const user = data.users.find(
        (u) => u.email?.toLowerCase().trim() === normalizedEmail
      );
      if (user?.id) {
        return user.id;
      }

      if (data.users.length < perPage) {
        break;
      }
      page += 1;
    }

    return null;
  }
}
