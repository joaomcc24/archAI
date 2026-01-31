import { supabaseAdmin as supabase } from '../supabase-server';
import { RepoFile } from './RepoParserService';

export interface Snapshot {
  id: string;
  project_id: string;
  markdown: string;
  repo_structure?: RepoFile | null;
  created_at: string;
}

export class SnapshotService {
  static async createSnapshot(
    projectId: string,
    markdown: string,
    repoStructure?: RepoFile
  ): Promise<Snapshot> {
    const insertData: {
      project_id: string;
      markdown: string;
      repo_structure?: Record<string, unknown>;
    } = {
      project_id: projectId,
      markdown,
    };

    if (repoStructure) {
      insertData.repo_structure = repoStructure as unknown as Record<string, unknown>;
    }

    const { data, error } = await supabase
      .from('snapshots')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create snapshot: ${error.message}`);
    }

    return {
      ...data,
      repo_structure: data.repo_structure as unknown as RepoFile | null,
    };
  }

  static async getSnapshotsByProjectId(projectId: string): Promise<Snapshot[]> {
    const { data, error } = await supabase
      .from('snapshots')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.message?.includes("Could not find the table 'public.snapshots'")) {
        throw new Error(
          'Snapshots table not found. Ensure the database migrations have been applied.'
        );
      }
      throw new Error(`Failed to fetch snapshots: ${error.message}`);
    }

    return data || [];
  }

  static async getLatestSnapshot(projectId: string): Promise<Snapshot | null> {
    const { data, error } = await supabase
      .from('snapshots')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch snapshot: ${error.message}`);
    }

    return data;
  }

  static async getSnapshotById(snapshotId: string): Promise<Snapshot | null> {
    const { data, error } = await supabase
      .from('snapshots')
      .select('*')
      .eq('id', snapshotId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch snapshot: ${error.message}`);
    }

    return data;
  }
  
  static async deleteSnapshot(snapshotId: string): Promise<void> {
    const { error } = await supabase
      .from('snapshots')
      .delete()
      .eq('id', snapshotId);

    if (error) {
      throw new Error(`Failed to delete snapshot: ${error.message}`);
    }
  }

  static async deleteSnapshotsByProjectId(projectId: string): Promise<void> {
    const { error } = await supabase
      .from('snapshots')
      .delete()
      .eq('project_id', projectId);

    if (error) {
      if (error.message?.includes("Could not find the table 'public.snapshots'")) {
        throw new Error(
          'Snapshots table not found. Ensure the database migrations have been applied.'
        );
      }
      throw new Error(`Failed to delete snapshots: ${error.message}`);
    }
  }
}
