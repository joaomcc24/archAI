import axios from 'axios';

export interface RepoFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
  content?: string;
  children?: RepoFile[];
}

export interface RepoTreeResponse {
  sha: string;
  url: string;
  tree: Array<{
    path: string;
    mode: string;
    type: 'blob' | 'tree';
    sha: string;
    size?: number;
    url: string;
  }>;
}

export class RepoParserService {
  private readonly githubApiBase = 'https://api.github.com';

  async fetchRepoTree(
    repoName: string,
    accessToken: string,
    branch: string = 'main'
  ): Promise<RepoTreeResponse> {
    try {
      const response = await axios.get(
        `${this.githubApiBase}/repos/${repoName}/git/trees/${branch}?recursive=1`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'ArchAssistant/1.0',
          },
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new Error(`Failed to fetch repo tree: ${message}`);
      }
      throw new Error(`Failed to fetch repo tree: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  normalizeRepoStructure(treeData: RepoTreeResponse): RepoFile {
    const root: RepoFile = {
      name: '',
      path: '',
      type: 'dir',
      children: [],
    };

    const dirMap = new Map<string, RepoFile>();
    dirMap.set('', root);

    for (const item of treeData.tree) {
      const pathParts = item.path.split('/');
      const fileName = pathParts[pathParts.length - 1];
      
      if (this.shouldSkipFile(item.path)) {
        continue;
      }

      let currentPath = '';
      for (let i = 0; i < pathParts.length - 1; i++) {
        const dirName = pathParts[i];
        const nextPath = currentPath ? `${currentPath}/${dirName}` : dirName;
        
        if (!dirMap.has(nextPath)) {
          const dirNode: RepoFile = {
            name: dirName,
            path: nextPath,
            type: 'dir',
            children: [],
          };
          
          const parentDir = dirMap.get(currentPath);
          if (parentDir && parentDir.children) {
            parentDir.children.push(dirNode);
          }
          
          dirMap.set(nextPath, dirNode);
        }
        
        currentPath = nextPath;
      }

      const fileNode: RepoFile = {
        name: fileName,
        path: item.path,
        type: item.type === 'blob' ? 'file' : 'dir',
        size: item.size,
        children: item.type === 'tree' ? [] : undefined,
      };

      const parentPath = pathParts.slice(0, -1).join('/');
      const parentDir = dirMap.get(parentPath);
      
      if (parentDir && parentDir.children) {
        parentDir.children.push(fileNode);
      }

      if (item.type === 'tree') {
        dirMap.set(item.path, fileNode);
      }
    }

    return root;
  }

  private shouldSkipFile(filePath: string): boolean {
    const skipPatterns = [
      /^\./, // Hidden files
      /node_modules/, // Dependencies
      /\.git/, // Git files
      /\.DS_Store/, // macOS files
      /Thumbs\.db/, // Windows files
      /\.log$/, // Log files
      /\.tmp$/, // Temporary files
      /\.cache$/, // Cache files
      /coverage/, // Test coverage
      /dist/, // Build output
      /build/, // Build output
      /\.env/, // Environment files
      /package-lock\.json$/, // Lock files
      /yarn\.lock$/, // Lock files
      /pnpm-lock\.yaml$/, // Lock files
    ];

    return skipPatterns.some(pattern => pattern.test(filePath));
  }

  async fetchFileContent(
    repoName: string,
    filePath: string,
    accessToken: string,
    branch: string = 'main'
  ): Promise<string> {
    try {
      const response = await axios.get(
        `${this.githubApiBase}/repos/${repoName}/contents/${filePath}?ref=${branch}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'ArchAssistant/1.0',
          },
        }
      );

      const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
      return content;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new Error(`Failed to fetch file content: ${message}`);
      }
      throw new Error(`Failed to fetch file content: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
