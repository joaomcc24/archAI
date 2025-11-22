import axios from 'axios';
import { RepoParserService, RepoTreeResponse } from '../RepoParserService';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock axios.isAxiosError
const mockIsAxiosError = jest.fn();
jest.mocked(axios.isAxiosError).mockImplementation(mockIsAxiosError);

describe('RepoParserService', () => {
  let repoParserService: RepoParserService;

  beforeEach(() => {
    repoParserService = new RepoParserService();
    jest.clearAllMocks();
    mockIsAxiosError.mockReturnValue(false); // Default to false
  });

  describe('fetchRepoTree', () => {
    it('should fetch repository tree successfully', async () => {
      const mockTreeResponse: RepoTreeResponse = {
        sha: 'abc123',
        url: 'https://api.github.com/repos/test/repo/git/trees/abc123',
        tree: [
          {
            path: 'src/index.ts',
            mode: '100644',
            type: 'blob',
            sha: 'def456',
            size: 1024,
            url: 'https://api.github.com/repos/test/repo/git/blobs/def456',
          },
          {
            path: 'src/components',
            mode: '040000',
            type: 'tree',
            sha: 'ghi789',
            url: 'https://api.github.com/repos/test/repo/git/trees/ghi789',
          },
          {
            path: 'README.md',
            mode: '100644',
            type: 'blob',
            sha: 'jkl012',
            size: 2048,
            url: 'https://api.github.com/repos/test/repo/git/blobs/jkl012',
          },
        ],
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockTreeResponse });

      const result = await repoParserService.fetchRepoTree(
        'test/repo',
        'mock-token',
        'main'
      );

      expect(result).toEqual(mockTreeResponse);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/test/repo/git/trees/main?recursive=1',
        {
          headers: {
            'Authorization': 'Bearer mock-token',
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'ArchAssistant/1.0',
          },
        }
      );
    });

    it('should handle API errors gracefully', async () => {
      const errorResponse = {
        response: {
          data: {
            message: 'Not Found',
          },
        },
      };

      mockIsAxiosError.mockReturnValue(true);
      mockedAxios.get.mockRejectedValueOnce(errorResponse);

      await expect(
        repoParserService.fetchRepoTree('test/repo', 'invalid-token')
      ).rejects.toThrow('Failed to fetch repo tree: Not Found');
    });

    it('should handle network errors', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));

      await expect(
        repoParserService.fetchRepoTree('test/repo', 'mock-token')
      ).rejects.toThrow('Failed to fetch repo tree: Network Error');
    });
  });

  describe('normalizeRepoStructure', () => {
    it('should normalize tree structure into hierarchical format', () => {
      const mockTreeData: RepoTreeResponse = {
        sha: 'abc123',
        url: 'https://api.github.com/repos/test/repo/git/trees/abc123',
        tree: [
          {
            path: 'src/index.ts',
            mode: '100644',
            type: 'blob',
            sha: 'def456',
            size: 1024,
            url: 'https://api.github.com/repos/test/repo/git/blobs/def456',
          },
          {
            path: 'src/components/Button.tsx',
            mode: '100644',
            type: 'blob',
            sha: 'ghi789',
            size: 512,
            url: 'https://api.github.com/repos/test/repo/git/blobs/ghi789',
          },
          {
            path: 'README.md',
            mode: '100644',
            type: 'blob',
            sha: 'jkl012',
            size: 2048,
            url: 'https://api.github.com/repos/test/repo/git/blobs/jkl012',
          },
          {
            path: 'package.json',
            mode: '100644',
            type: 'blob',
            sha: 'mno345',
            size: 256,
            url: 'https://api.github.com/repos/test/repo/git/blobs/mno345',
          },
        ],
      };

      const result = repoParserService.normalizeRepoStructure(mockTreeData);

      expect(result).toEqual({
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
                size: 1024,
              },
              {
                name: 'components',
                path: 'src/components',
                type: 'dir',
                children: [
                  {
                    name: 'Button.tsx',
                    path: 'src/components/Button.tsx',
                    type: 'file',
                    size: 512,
                  },
                ],
              },
            ],
          },
          {
            name: 'README.md',
            path: 'README.md',
            type: 'file',
            size: 2048,
          },
          {
            name: 'package.json',
            path: 'package.json',
            type: 'file',
            size: 256,
          },
        ],
      });
    });

    it('should skip hidden files and common non-code files', () => {
      const mockTreeData: RepoTreeResponse = {
        sha: 'abc123',
        url: 'https://api.github.com/repos/test/repo/git/trees/abc123',
        tree: [
          {
            path: 'src/index.ts',
            mode: '100644',
            type: 'blob',
            sha: 'def456',
            size: 1024,
            url: 'https://api.github.com/repos/test/repo/git/blobs/def456',
          },
          {
            path: '.gitignore',
            mode: '100644',
            type: 'blob',
            sha: 'ghi789',
            size: 256,
            url: 'https://api.github.com/repos/test/repo/git/blobs/ghi789',
          },
          {
            path: 'node_modules/package/index.js',
            mode: '100644',
            type: 'blob',
            sha: 'jkl012',
            size: 512,
            url: 'https://api.github.com/repos/test/repo/git/blobs/jkl012',
          },
          {
            path: 'dist/bundle.js',
            mode: '100644',
            type: 'blob',
            sha: 'mno345',
            size: 1024,
            url: 'https://api.github.com/repos/test/repo/git/blobs/mno345',
          },
          {
            path: 'package-lock.json',
            mode: '100644',
            type: 'blob',
            sha: 'pqr678',
            size: 2048,
            url: 'https://api.github.com/repos/test/repo/git/blobs/pqr678',
          },
        ],
      };

      const result = repoParserService.normalizeRepoStructure(mockTreeData);

      // Should only include src/index.ts, skipping hidden files, node_modules, dist, and lock files
      expect(result.children).toHaveLength(1);
      expect(result.children![0]).toEqual({
        name: 'src',
        path: 'src',
        type: 'dir',
        children: [
          {
            name: 'index.ts',
            path: 'src/index.ts',
            type: 'file',
            size: 1024,
          },
        ],
      });
    });
  });

  describe('fetchFileContent', () => {
    it('should fetch file content successfully', async () => {
      const mockFileResponse = {
        content: Buffer.from('Hello, World!').toString('base64'),
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockFileResponse });

      const result = await repoParserService.fetchFileContent(
        'test/repo',
        'README.md',
        'mock-token',
        'main'
      );

      expect(result).toBe('Hello, World!');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/test/repo/contents/README.md?ref=main',
        {
          headers: {
            'Authorization': 'Bearer mock-token',
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'ArchAssistant/1.0',
          },
        }
      );
    });

    it('should handle file fetch errors', async () => {
      const errorResponse = {
        response: {
          data: {
            message: 'Not Found',
          },
        },
      };

      mockIsAxiosError.mockReturnValue(true);
      mockedAxios.get.mockRejectedValueOnce(errorResponse);

      await expect(
        repoParserService.fetchFileContent('test/repo', 'nonexistent.md', 'mock-token')
      ).rejects.toThrow('Failed to fetch file content: Not Found');
    });
  });
});
