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

export interface RepoInfo {
  default_branch: string;
  name: string;
  full_name: string;
  description: string | null;
}

export class RepoParserService {
  private readonly githubApiBase = 'https://api.github.com';

  /**
   * Fetch repository info including the default branch
   */
  async fetchRepoInfo(repoName: string, accessToken: string): Promise<RepoInfo> {
    try {
      const response = await fetch(
        `${this.githubApiBase}/repos/${repoName}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'ArchAssistant/1.0',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return {
        default_branch: data.default_branch,
        name: data.name,
        full_name: data.full_name,
        description: data.description,
      };
    } catch (error) {
      throw new Error(`Failed to fetch repo info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Fetch all branches for a repository
   */
  async fetchBranches(
    repoName: string,
    accessToken: string
  ): Promise<Array<{ name: string; isDefault: boolean }>> {
    try {
      // First get the default branch
      const repoInfo = await this.fetchRepoInfo(repoName, accessToken);
      
      // Then fetch all branches
      const response = await fetch(
        `${this.githubApiBase}/repos/${repoName}/branches?per_page=100`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'ArchAssistant/1.0',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.map((branch: { name: string }) => ({
        name: branch.name,
        isDefault: branch.name === repoInfo.default_branch,
      }));
    } catch (error) {
      throw new Error(`Failed to fetch branches: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Fetch repo tree, auto-detecting the default branch if not specified
   */
  async fetchRepoTree(
    repoName: string,
    accessToken: string,
    branch?: string
  ): Promise<RepoTreeResponse> {
    try {
      // If no branch specified, fetch the repo's default branch
      const targetBranch = branch || (await this.fetchRepoInfo(repoName, accessToken)).default_branch;
      
      const response = await fetch(
        `${this.githubApiBase}/repos/${repoName}/git/trees/${targetBranch}?recursive=1`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'ArchAssistant/1.0',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to fetch repo tree: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private shouldSkipFile(path: string): boolean {
    const skipPatterns = [
      /node_modules/,
      /\.git\//,
      /\.next\//,
      /dist\//,
      /build\//,
      /coverage\//,
      /\.cache\//,
      /\.turbo\//,
      /\.vercel\//,
      /\.DS_Store/,
      /\.env\.local/,
      /\.env\..*\.local/,
      /package-lock\.json/,
      /pnpm-lock\.yaml/,
      /yarn\.lock/,
      /\.ico$/,
      /\.png$/,
      /\.jpg$/,
      /\.jpeg$/,
      /\.gif$/,
      /\.svg$/,
      /\.woff2?$/,
      /\.ttf$/,
      /\.eot$/,
    ];

    return skipPatterns.some((pattern) => pattern.test(path));
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

      // Ensure parent directories exist
      let currentPath = '';
      for (let i = 0; i < pathParts.length - 1; i++) {
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${pathParts[i]}` : pathParts[i];
        
        if (!dirMap.has(currentPath)) {
          const dir: RepoFile = {
            name: pathParts[i],
            path: currentPath,
            type: 'dir',
            children: [],
          };
          dirMap.set(currentPath, dir);
          const parent = dirMap.get(parentPath);
          if (parent && parent.children) {
            parent.children.push(dir);
          }
        }
      }

      // Add the file or directory
      const parentPath = pathParts.slice(0, -1).join('/');
      const parent = dirMap.get(parentPath);

      if (item.type === 'tree') {
        if (!dirMap.has(item.path)) {
          const dir: RepoFile = {
            name: fileName,
            path: item.path,
            type: 'dir',
            children: [],
          };
          dirMap.set(item.path, dir);
          if (parent && parent.children) {
            parent.children.push(dir);
          }
        }
      } else {
        const file: RepoFile = {
          name: fileName,
          path: item.path,
          type: 'file',
          size: item.size,
        };
        if (parent && parent.children) {
          parent.children.push(file);
        }
      }
    }

    return root;
  }
}
