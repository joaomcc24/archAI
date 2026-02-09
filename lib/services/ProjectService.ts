import { supabaseAdmin as supabase } from '../supabase-server';
import { ProjectMembershipService } from './ProjectMembershipService';

export interface Project {
  id: string;
  user_id: string;
  repo_name: string;
  installation_id: string;
  github_token?: string;
  branch?: string;
  is_shared?: boolean;
  created_at: string;
}

export class ProjectService {
  static async createProject(
    userId: string,
    repoName: string,
    installationId: string,
    githubToken?: string,
    branch?: string
  ): Promise<Project> {
    const insertData: {
      user_id: string;
      repo_name: string;
      installation_id: string;
      github_token?: string;
      branch?: string;
    } = {
      user_id: userId,
      repo_name: repoName,
      installation_id: installationId,
    };

    // Store token if provided (in production, encrypt before storing)
    if (githubToken) {
      insertData.github_token = githubToken;
    }

    // Store branch if provided
    if (branch) {
      insertData.branch = branch;
    }

    const { data, error } = await supabase
      .from('projects')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create project: ${error.message}`);
    }

    // Automatically create owner membership
    try {
      await supabase
        .from('project_members')
        .insert({
          project_id: data.id,
          user_id: userId,
          role: 'owner',
          invited_at: new Date().toISOString(),
          joined_at: new Date().toISOString(),
        });
    } catch (membershipError) {
      // If membership creation fails, delete the project to maintain consistency
      await supabase.from('projects').delete().eq('id', data.id);
      throw new Error(`Failed to create project membership: ${membershipError instanceof Error ? membershipError.message : 'Unknown error'}`);
    }

    return data;
  }

  static async getProjectsByUserId(userId: string, includeShared: boolean = true): Promise<Project[]> {
    if (!includeShared) {
      // Only get projects where user is the owner
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch projects: ${error.message}`);
      }

      return data || [];
    }

    // Try to get projects where user is owner OR member
    // Fallback to old behavior if project_members table doesn't exist yet
    const { data, error } = await supabase
      .from('project_members')
      .select('projects(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      // If table doesn't exist, fallback to old behavior (owned projects only)
      if (error.message?.includes('project_members') || error.code === 'PGRST205') {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (fallbackError) {
          throw new Error(`Failed to fetch projects: ${fallbackError.message}`);
        }

        return fallbackData || [];
      }
      throw new Error(`Failed to fetch projects: ${error.message}`);
    }

    // Extract projects from the join result
    const projects = (data || [])
      .map((item: any) => item.projects)
      .filter((project: Project | null) => project !== null) as Project[];

    return projects;
  }

  static async getSharedProjectsByUserId(userId: string): Promise<Project[]> {
    // Get projects where user is a member but not the owner
    const { data, error } = await supabase
      .from('project_members')
      .select('projects(*)')
      .eq('user_id', userId)
      .neq('role', 'owner')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch shared projects: ${error.message}`);
    }

    // Extract projects from the join result
    const projects = (data || [])
      .map((item: any) => item.projects)
      .filter((project: Project | null) => project !== null) as Project[];

    return projects;
  }

  /**
   * Check if user has access to a project
   */
  static async hasProjectAccess(projectId: string, userId: string): Promise<boolean> {
    const role = await ProjectMembershipService.getUserRole(projectId, userId);
    return role !== null;
  }

  static async getProjectById(projectId: string): Promise<Project | null> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch project: ${error.message}`);
    }

    return data;
  }

  static async deleteProject(projectId: string): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      throw new Error(`Failed to delete project: ${error.message}`);
    }
  }
}
