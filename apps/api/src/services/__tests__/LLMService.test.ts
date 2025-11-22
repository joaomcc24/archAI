// @ts-nocheck
/// <reference types="jest" />

import { SnapshotService } from '../SnapshotService';
import { RepoFile } from '../RepoParserService';

// Mock OpenAI before importing LLMService
const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: `# Test Repository Architecture

## Overview
This is a test repository for demonstrating the architecture generation pipeline.

## Tech Stack
- Node.js
- TypeScript
- Express
- Supabase

## Project Structure
The project follows a clean architecture pattern with separate layers for routes, services, and data access.

## Key Components
- API routes for handling HTTP requests
- Services for business logic
- Database models for data persistence

## Development Setup
1. Install dependencies: \`npm install\`
2. Set up environment variables
3. Run the application: \`npm start\``,
            },
          },
        ],
      }),
    },
  },
};

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockOpenAI),
}));

import { LLMService } from '../LLMService';

// Mock Supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockedSupabase = require('../../lib/supabase').supabase;

describe('LLM + Snapshot Integration Pipeline', () => {
  let llmService: LLMService;
  let mockRepoStructure: RepoFile;

  beforeEach(() => {
    jest.clearAllMocks();
    // Set environment variable for testing
    process.env.OPENAI_API_KEY = 'test-api-key';
    process.env.LLM_PROVIDER = 'openai';
    // Reset the mock to return successful response by default
    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [
        {
          message: {
            content: `# Test Repository Architecture

## Overview
This is a test repository for demonstrating the architecture generation pipeline.

## Tech Stack
- Node.js
- TypeScript
- Express
- Supabase

## Project Structure
The project follows a clean architecture pattern with separate layers for routes, services, and data access.

## Key Components
- API routes for handling HTTP requests
- Services for business logic
- Database models for data persistence

## Development Setup
1. Install dependencies: \`npm install\`
2. Set up environment variables
3. Run the application: \`npm start\``,
          },
        },
      ],
    });
    llmService = new LLMService();

    // Mock repository structure
    mockRepoStructure = {
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
              name: 'routes',
              path: 'src/routes',
              type: 'dir',
              children: [
                {
                  name: 'index.ts',
                  path: 'src/routes/index.ts',
                  type: 'file',
                  size: 1024,
                },
              ],
            },
            {
              name: 'services',
              path: 'src/services',
              type: 'dir',
              children: [
                {
                  name: 'UserService.ts',
                  path: 'src/services/UserService.ts',
                  type: 'file',
                  size: 2048,
                },
              ],
            },
          ],
        },
        {
          name: 'package.json',
          path: 'package.json',
          type: 'file',
          size: 512,
        },
        {
          name: 'README.md',
          path: 'README.md',
          type: 'file',
          size: 256,
        },
      ],
    };
  });

  afterEach(() => {
    delete process.env.LLM_PROVIDER;
    delete process.env.OLLAMA_BASE_URL;
    delete process.env.OLLAMA_MODEL;
  });

  describe('Complete Pipeline: LLM Generation + Snapshot Storage', () => {
    it('should generate architecture markdown and save to database', async () => {
      const projectId = 'test-project-123';
      const repoName = 'testuser/test-repo';

      // Mock Supabase response for snapshot creation
      const mockSnapshot = {
        id: 'snapshot-123',
        project_id: projectId,
        markdown: '# Test Repository Architecture\n\n## Overview\nThis is a test repository...',
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockSnapshot, error: null }),
      };

      mockedSupabase.from.mockReturnValue(mockQuery);

      // Execute the pipeline
      const architectureMarkdown = await llmService.generateArchitectureMarkdown({
        repoName,
        repoStructure: mockRepoStructure,
      });

      const snapshot = await SnapshotService.createSnapshot(projectId, architectureMarkdown);

      // Verify LLM service was called correctly
      expect(architectureMarkdown).toContain('# Test Repository Architecture');
      expect(architectureMarkdown).toContain('## Overview');
      expect(architectureMarkdown).toContain('## Tech Stack');

      // Verify snapshot was saved correctly
      expect(snapshot).toEqual(mockSnapshot);
      expect(mockedSupabase.from).toHaveBeenCalledWith('snapshots');
      expect(mockQuery.insert).toHaveBeenCalledWith({
        project_id: projectId,
        markdown: architectureMarkdown,
      });
    });

    it('should handle LLM service errors gracefully', async () => {
      const projectId = 'test-project-123';
      const repoName = 'testuser/test-repo';

      // Mock OpenAI to throw an error
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('OpenAI API error'));

      await expect(
        llmService.generateArchitectureMarkdown({
          repoName,
          repoStructure: mockRepoStructure,
        })
      ).rejects.toThrow('Failed to generate architecture markdown: OpenAI API error');
    });

    it('should handle snapshot service errors gracefully', async () => {
      const projectId = 'test-project-123';
      const repoName = 'testuser/test-repo';

      // Mock Supabase to return an error
      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' },
        }),
      };

      mockedSupabase.from.mockReturnValue(mockQuery);

      // Generate architecture markdown successfully first
      const architectureMarkdown = await llmService.generateArchitectureMarkdown({
        repoName,
        repoStructure: mockRepoStructure,
      });

      // Then test that snapshot creation fails
      await expect(
        SnapshotService.createSnapshot(projectId, architectureMarkdown)
      ).rejects.toThrow('Failed to create snapshot: Database connection failed');
    });
  });

  describe('Snapshot Service Operations', () => {
    it('should retrieve snapshots by project ID', async () => {
      const projectId = 'test-project-123';
      const mockSnapshots = [
        {
          id: 'snapshot-1',
          project_id: projectId,
          markdown: '# Architecture 1',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'snapshot-2',
          project_id: projectId,
          markdown: '# Architecture 2',
          created_at: '2024-01-02T00:00:00Z',
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockSnapshots, error: null }),
      };

      mockedSupabase.from.mockReturnValue(mockQuery);

      const snapshots = await SnapshotService.getSnapshotsByProjectId(projectId);

      expect(snapshots).toEqual(mockSnapshots);
      expect(mockedSupabase.from).toHaveBeenCalledWith('snapshots');
    });

    it('should get latest snapshot for a project', async () => {
      const projectId = 'test-project-123';
      const mockSnapshot = {
        id: 'snapshot-latest',
        project_id: projectId,
        markdown: '# Latest Architecture',
        created_at: '2024-01-02T00:00:00Z',
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockSnapshot, error: null }),
      };

      mockedSupabase.from.mockReturnValue(mockQuery);

      const snapshot = await SnapshotService.getLatestSnapshot(projectId);

      expect(snapshot).toEqual(mockSnapshot);
    });

    it('should return null when no snapshots exist', async () => {
      const projectId = 'test-project-123';

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }, // Not found error
        }),
      };

      mockedSupabase.from.mockReturnValue(mockQuery);

      const snapshot = await SnapshotService.getLatestSnapshot(projectId);

      expect(snapshot).toBeNull();
    });
  });
});

describe('LLMService with Ollama provider', () => {
  const originalFetch = global.fetch;

  const repoStructure: RepoFile = {
    name: '',
    path: '',
    type: 'dir',
    children: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.LLM_PROVIDER = 'ollama';
    process.env.OLLAMA_BASE_URL = 'http://localhost:11434';
    process.env.OLLAMA_MODEL = 'llama3';

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          content: '# Architecture',
        },
      }),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (global as any).fetch;
    }
    delete process.env.LLM_PROVIDER;
    delete process.env.OLLAMA_BASE_URL;
    delete process.env.OLLAMA_MODEL;
  });

  it('should generate architecture markdown using Ollama', async () => {
    const service = new LLMService();

    const result = await service.generateArchitectureMarkdown({
      repoName: 'test/repo',
      repoStructure,
    });

    expect(result).toContain('# Architecture');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/chat',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('should throw a descriptive error when Ollama request fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal error',
    });

    const service = new LLMService();

    await expect(
      service.generateArchitectureMarkdown({
        repoName: 'test/repo',
        repoStructure,
      })
    ).rejects.toThrow('Failed to generate architecture markdown: Ollama request failed with status 500: Internal error');
  });
});
