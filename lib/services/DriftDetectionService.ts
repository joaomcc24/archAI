import { RepoFile } from './RepoParserService';
import { supabaseAdmin as supabase } from '../supabase-server';
import * as diff from 'diff';

export interface FileChange {
  path: string;
  type: 'added' | 'removed' | 'modified';
  previousSize?: number;
  currentSize?: number;
}

export interface FileChanges {
  added: string[];
  removed: string[];
  modified: string[];
}

export interface DriftResult {
  id: string;
  project_id: string;
  snapshot_id: string;
  current_repo_structure: RepoFile | null;
  previous_repo_structure: RepoFile | null;
  file_changes: FileChanges;
  structure_diff: string;
  architecture_diff: string;
  drift_score: number;
  status: 'pending' | 'completed' | 'error';
  created_at: string;
  completed_at: string | null;
}

export class DriftDetectionService {

  /**
   * Main method to detect drift between current repo state and latest snapshot
   */
  async detectDrift(
    projectId: string,
    currentRepoStructure: RepoFile,
    previousSnapshotId: string,
    previousRepoStructure: RepoFile | null,
    currentArchitectureMarkdown: string,
    previousArchitectureMarkdown: string
  ): Promise<DriftResult> {
    // Create a pending drift result record
    const { data: driftRecord, error: insertError } = await supabase
      .from('drift_results')
      .insert({
        project_id: projectId,
        snapshot_id: previousSnapshotId,
        current_repo_structure: currentRepoStructure as unknown as Record<string, unknown>,
        previous_repo_structure: previousRepoStructure as unknown as Record<string, unknown> | null,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError || !driftRecord) {
      throw new Error(`Failed to create drift result: ${insertError?.message || 'Unknown error'}`);
    }

    try {
      // Compare repo structures
      const fileChanges = this.compareRepoStructures(currentRepoStructure, previousRepoStructure);
      
      // Generate structure diff
      const structureDiff = this.generateStructureDiff(fileChanges);
      
      // Compare architecture markdown
      const architectureDiff = this.compareArchitectureMarkdown(
        currentArchitectureMarkdown,
        previousArchitectureMarkdown
      );
      
      // Calculate drift score
      const driftScore = this.calculateDriftScore(fileChanges, architectureDiff);
      
      // Update the drift result with completed data
      const { data: updatedDrift, error: updateError } = await supabase
        .from('drift_results')
        .update({
          file_changes: fileChanges as unknown as Record<string, unknown>,
          structure_diff: structureDiff,
          architecture_diff: architectureDiff,
          drift_score: driftScore,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', driftRecord.id)
        .select()
        .single();

      if (updateError || !updatedDrift) {
        throw new Error(`Failed to update drift result: ${updateError?.message || 'Unknown error'}`);
      }

      return {
        id: updatedDrift.id,
        project_id: updatedDrift.project_id,
        snapshot_id: updatedDrift.snapshot_id,
        current_repo_structure: updatedDrift.current_repo_structure as unknown as RepoFile,
        previous_repo_structure: updatedDrift.previous_repo_structure as unknown as RepoFile | null,
        file_changes: updatedDrift.file_changes as unknown as FileChanges,
        structure_diff: updatedDrift.structure_diff,
        architecture_diff: updatedDrift.architecture_diff,
        drift_score: updatedDrift.drift_score,
        status: updatedDrift.status as 'pending' | 'completed' | 'error',
        created_at: updatedDrift.created_at,
        completed_at: updatedDrift.completed_at,
      };
    } catch (error) {
      // Mark as error if something went wrong
      await supabase
        .from('drift_results')
        .update({
          status: 'error',
          completed_at: new Date().toISOString(),
        })
        .eq('id', driftRecord.id);

      throw error;
    }
  }

  /**
   * Compare two repo structures and identify file changes
   */
  compareRepoStructures(
    current: RepoFile,
    previous: RepoFile | null
  ): FileChanges {
    if (!previous) {
      // If no previous structure, all current files are "added"
      const allFiles = this.getAllFiles(current);
      return {
        added: allFiles,
        removed: [],
        modified: [],
      };
    }

    const currentFiles = this.getAllFiles(current);
    const previousFiles = this.getAllFiles(previous);
    
    const currentFileMap = new Map<string, { size?: number }>();
    const previousFileMap = new Map<string, { size?: number }>();

    // Build maps of current files
    this.buildFileMap(current, currentFileMap);
    this.buildFileMap(previous, previousFileMap);

    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];

    // Find added files
    for (const file of currentFiles) {
      if (!previousFileMap.has(file)) {
        added.push(file);
      } else {
        // Check if file was modified (size changed)
        const currentFile = currentFileMap.get(file);
        const previousFile = previousFileMap.get(file);
        if (currentFile?.size !== previousFile?.size) {
          modified.push(file);
        }
      }
    }

    // Find removed files
    for (const file of previousFiles) {
      if (!currentFileMap.has(file)) {
        removed.push(file);
      }
    }

    return { added, removed, modified };
  }

  /**
   * Get all file paths from a repo structure (recursively)
   */
  private getAllFiles(structure: RepoFile): string[] {
    const files: string[] = [];
    
    const traverse = (node: RepoFile) => {
      if (node.type === 'file') {
        files.push(node.path);
      } else if (node.children) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    };

    traverse(structure);
    return files;
  }

  /**
   * Build a map of file paths to their metadata
   */
  private buildFileMap(structure: RepoFile, map: Map<string, { size?: number }>): void {
    const traverse = (node: RepoFile) => {
      if (node.type === 'file') {
        map.set(node.path, { size: node.size });
      } else if (node.children) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    };

    traverse(structure);
  }

  /**
   * Generate a markdown-formatted diff of structural changes
   */
  private generateStructureDiff(changes: FileChanges): string {
    const lines: string[] = ['# Repository Structure Changes\n'];
    
    if (changes.added.length === 0 && changes.removed.length === 0 && changes.modified.length === 0) {
      lines.push('No structural changes detected.');
      return lines.join('\n');
    }

    if (changes.added.length > 0) {
      lines.push('## Added Files\n');
      for (const file of changes.added) {
        lines.push(`- \`${file}\` (new)`);
      }
      lines.push('');
    }

    if (changes.removed.length > 0) {
      lines.push('## Removed Files\n');
      for (const file of changes.removed) {
        lines.push(`- \`${file}\` (deleted)`);
      }
      lines.push('');
    }

    if (changes.modified.length > 0) {
      lines.push('## Modified Files\n');
      for (const file of changes.modified) {
        lines.push(`- \`${file}\` (changed)`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Compare architecture markdown content and generate a diff
   */
  compareArchitectureMarkdown(current: string, previous: string): string {
    if (current === previous) {
      return 'No changes detected in architecture documentation.';
    }

    // Use diff package to compare lines
    const diffs = diff.diffLines(previous, current);

    // Format diffs as markdown
    const lines: string[] = ['# Architecture Documentation Changes\n'];
    
    let hasChanges = false;
    const addedLines: string[] = [];
    const removedLines: string[] = [];

    for (const part of diffs) {
      if (part.added) {
        hasChanges = true;
        const newLines = part.value.split('\n').filter(line => line.trim());
        addedLines.push(...newLines);
      } else if (part.removed) {
        hasChanges = true;
        const deletedLines = part.value.split('\n').filter(line => line.trim());
        removedLines.push(...deletedLines);
      }
    }

    if (!hasChanges) {
      return 'No significant changes detected in architecture documentation.';
    }

    if (removedLines.length > 0) {
      lines.push('## Removed\n');
      for (const line of removedLines) {
        lines.push(`- ${line}`);
      }
      lines.push('');
    }

    if (addedLines.length > 0) {
      lines.push('## Added\n');
      for (const line of addedLines) {
        lines.push(`+ ${line}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Calculate a drift score (0-100) based on changes
   * Higher score = more drift
   */
  calculateDriftScore(changes: FileChanges, architectureDiff: string): number {
    let score = 0;

    // Weight architectural changes more heavily (0-60 points)
    const hasArchChanges = architectureDiff.includes('## Added') || 
                          architectureDiff.includes('## Removed') ||
                          architectureDiff.includes('No changes detected') === false;
    
    if (hasArchChanges) {
      // Count significant architectural changes
      const archChangeCount = (
        (architectureDiff.match(/## Added/g) || []).length +
        (architectureDiff.match(/## Removed/g) || []).length
      );
      score += Math.min(60, archChangeCount * 15);
    }

    // File additions (0-20 points)
    score += Math.min(20, changes.added.length * 2);

    // File removals (0-15 points)
    score += Math.min(15, changes.removed.length * 3);

    // File modifications (0-5 points)
    score += Math.min(5, changes.modified.length * 1);

    return Math.min(100, Math.round(score));
  }

  /**
   * Get drift results for a project
   */
  static async getDriftResultsByProjectId(projectId: string): Promise<DriftResult[]> {
    const { data, error } = await supabase
      .from('drift_results')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch drift results: ${error.message}`);
    }

    return (data || []).map((drift) => ({
      id: drift.id,
      project_id: drift.project_id,
      snapshot_id: drift.snapshot_id,
      current_repo_structure: drift.current_repo_structure as unknown as RepoFile,
      previous_repo_structure: drift.previous_repo_structure as unknown as RepoFile | null,
      file_changes: drift.file_changes as unknown as FileChanges,
      structure_diff: drift.structure_diff,
      architecture_diff: drift.architecture_diff,
      drift_score: drift.drift_score,
      status: drift.status as 'pending' | 'completed' | 'error',
      created_at: drift.created_at,
      completed_at: drift.completed_at,
    }));
  }

  /**
   * Get latest drift result for a project
   */
  static async getLatestDriftResult(projectId: string): Promise<DriftResult | null> {
    const { data, error } = await supabase
      .from('drift_results')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch drift result: ${error.message}`);
    }

    return {
      id: data.id,
      project_id: data.project_id,
      snapshot_id: data.snapshot_id,
      current_repo_structure: data.current_repo_structure as unknown as RepoFile,
      previous_repo_structure: data.previous_repo_structure as unknown as RepoFile | null,
      file_changes: data.file_changes as unknown as FileChanges,
      structure_diff: data.structure_diff,
      architecture_diff: data.architecture_diff,
      drift_score: data.drift_score,
      status: data.status as 'pending' | 'completed' | 'error',
      created_at: data.created_at,
      completed_at: data.completed_at,
    };
  }
}
