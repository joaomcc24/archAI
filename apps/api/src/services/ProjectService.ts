import { supabase } from '../lib/supabase';
import { Project } from '../types/database';

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

    return data;
  }

  static async getProjectsByUserId(userId: string): Promise<Project[]> {
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
