import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DriftDetectionService } from '../DriftDetectionService';
import { RepoFile } from '../RepoParserService';

// Mock Supabase
vi.mock('../../supabase-server', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: 'drift-123', project_id: 'project-123', snapshot_id: 'snapshot-123', status: 'pending' },
            error: null,
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: {
                id: 'drift-123',
                project_id: 'project-123',
                snapshot_id: 'snapshot-123',
                file_changes: { added: [], removed: [], modified: [] },
                structure_diff: '',
                architecture_diff: '',
                drift_score: 0,
                status: 'completed',
                created_at: new Date().toISOString(),
                completed_at: new Date().toISOString(),
              },
              error: null,
            })),
          })),
        })),
      })),
    })),
  },
}));

describe('DriftDetectionService', () => {
  let service: DriftDetectionService;

  beforeEach(() => {
    service = new DriftDetectionService();
  });

  describe('compareRepoStructures', () => {
    it('should return empty changes for identical structures', () => {
      const structure: RepoFile = {
        name: '',
        path: '',
        type: 'dir',
        children: [
          {
            name: 'src',
            path: 'src',
            type: 'dir',
            children: [
              {
                name: 'index.ts',
                path: 'src/index.ts',
                type: 'file',
                size: 100,
              },
            ],
          },
        ],
      };

      const changes = service['compareRepoStructures'](structure, structure);
      expect(changes.added).toEqual([]);
      expect(changes.removed).toEqual([]);
      expect(changes.modified).toEqual([]);
    });

    it('should detect added files', () => {
      const previous: RepoFile = {
        name: '',
        path: '',
        type: 'dir',
        children: [
          {
            name: 'src',
            path: 'src',
            type: 'dir',
            children: [
              {
                name: 'index.ts',
                path: 'src/index.ts',
                type: 'file',
                size: 100,
              },
            ],
          },
        ],
      };

      const current: RepoFile = {
        name: '',
        path: '',
        type: 'dir',
        children: [
          {
            name: 'src',
            path: 'src',
            type: 'dir',
            children: [
              {
                name: 'index.ts',
                path: 'src/index.ts',
                type: 'file',
                size: 100,
              },
              {
                name: 'new.ts',
                path: 'src/new.ts',
                type: 'file',
                size: 50,
              },
            ],
          },
        ],
      };

      const changes = service['compareRepoStructures'](current, previous);
      expect(changes.added).toContain('src/new.ts');
      expect(changes.removed).toEqual([]);
      expect(changes.modified).toEqual([]);
    });

    it('should detect removed files', () => {
      const previous: RepoFile = {
        name: '',
        path: '',
        type: 'dir',
        children: [
          {
            name: 'src',
            path: 'src',
            type: 'dir',
            children: [
              {
                name: 'index.ts',
                path: 'src/index.ts',
                type: 'file',
                size: 100,
              },
              {
                name: 'old.ts',
                path: 'src/old.ts',
                type: 'file',
                size: 50,
              },
            ],
          },
        ],
      };

      const current: RepoFile = {
        name: '',
        path: '',
        type: 'dir',
        children: [
          {
            name: 'src',
            path: 'src',
            type: 'dir',
            children: [
              {
                name: 'index.ts',
                path: 'src/index.ts',
                type: 'file',
                size: 100,
              },
            ],
          },
        ],
      };

      const changes = service['compareRepoStructures'](current, previous);
      expect(changes.added).toEqual([]);
      expect(changes.removed).toContain('src/old.ts');
      expect(changes.modified).toEqual([]);
    });

    it('should detect modified files (size change)', () => {
      const previous: RepoFile = {
        name: '',
        path: '',
        type: 'dir',
        children: [
          {
            name: 'src',
            path: 'src',
            type: 'dir',
            children: [
              {
                name: 'index.ts',
                path: 'src/index.ts',
                type: 'file',
                size: 100,
              },
            ],
          },
        ],
      };

      const current: RepoFile = {
        name: '',
        path: '',
        type: 'dir',
        children: [
          {
            name: 'src',
            path: 'src',
            type: 'dir',
            children: [
              {
                name: 'index.ts',
                path: 'src/index.ts',
                type: 'file',
                size: 200,
              },
            ],
          },
        ],
      };

      const changes = service['compareRepoStructures'](current, previous);
      expect(changes.added).toEqual([]);
      expect(changes.removed).toEqual([]);
      expect(changes.modified).toContain('src/index.ts');
    });

    it('should handle null previous structure (all files are added)', () => {
      const current: RepoFile = {
        name: '',
        path: '',
        type: 'dir',
        children: [
          {
            name: 'src',
            path: 'src',
            type: 'dir',
            children: [
              {
                name: 'index.ts',
                path: 'src/index.ts',
                type: 'file',
                size: 100,
              },
            ],
          },
        ],
      };

      const changes = service['compareRepoStructures'](current, null);
      expect(changes.added).toContain('src/index.ts');
      expect(changes.removed).toEqual([]);
      expect(changes.modified).toEqual([]);
    });
  });

  describe('compareArchitectureMarkdown', () => {
    it('should return no changes message for identical markdown', () => {
      const markdown = '# Architecture\n\nThis is the architecture.';
      const diff = service['compareArchitectureMarkdown'](markdown, markdown);
      expect(diff).toContain('No changes detected');
    });

    it('should detect changes in markdown', () => {
      const previous = '# Architecture\n\nOld content.';
      const current = '# Architecture\n\nNew content.';
      const diff = service['compareArchitectureMarkdown'](current, previous);
      expect(diff).toContain('Architecture Documentation Changes');
    });
  });

  describe('calculateDriftScore', () => {
    it('should return 0 for no changes', () => {
      const changes = { added: [], removed: [], modified: [] };
      const archDiff = 'No changes detected in architecture documentation.';
      const score = service['calculateDriftScore'](changes, archDiff);
      expect(score).toBe(0);
    });

    it('should weight architectural changes heavily', () => {
      const changes = { added: [], removed: [], modified: [] };
      const archDiff = '## Added\n\nNew section\n## Removed\n\nOld section';
      const score = service['calculateDriftScore'](changes, archDiff);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should add points for file additions', () => {
      const changes = { added: ['file1.ts', 'file2.ts'], removed: [], modified: [] };
      const archDiff = 'No changes detected in architecture documentation.';
      const score = service['calculateDriftScore'](changes, archDiff);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should add points for file removals', () => {
      const changes = { added: [], removed: ['file1.ts'], modified: [] };
      const archDiff = 'No changes detected in architecture documentation.';
      const score = service['calculateDriftScore'](changes, archDiff);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should add points for file modifications', () => {
      const changes = { added: [], removed: [], modified: ['file1.ts'] };
      const archDiff = 'No changes detected in architecture documentation.';
      const score = service['calculateDriftScore'](changes, archDiff);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should cap score at 100', () => {
      const changes = {
        added: Array(50).fill(0).map((_, i) => `file${i}.ts`),
        removed: Array(50).fill(0).map((_, i) => `old${i}.ts`),
        modified: Array(50).fill(0).map((_, i) => `mod${i}.ts`),
      };
      const archDiff = '## Added\n\nMany changes\n## Removed\n\nMany removals';
      const score = service['calculateDriftScore'](changes, archDiff);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('generateStructureDiff', () => {
    it('should generate markdown diff for file changes', () => {
      const changes = {
        added: ['src/new.ts'],
        removed: ['src/old.ts'],
        modified: ['src/index.ts'],
      };
      const diff = service['generateStructureDiff'](changes);
      expect(diff).toContain('Repository Structure Changes');
      expect(diff).toContain('Added Files');
      expect(diff).toContain('Removed Files');
      expect(diff).toContain('Modified Files');
      expect(diff).toContain('src/new.ts');
      expect(diff).toContain('src/old.ts');
      expect(diff).toContain('src/index.ts');
    });

    it('should return no changes message when empty', () => {
      const changes = { added: [], removed: [], modified: [] };
      const diff = service['generateStructureDiff'](changes);
      expect(diff).toContain('No structural changes detected');
    });
  });
});
