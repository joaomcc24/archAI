import { Router } from 'express';
import { ProjectService } from '../services/ProjectService';
import { RepoParserService } from '../services/RepoParserService';
import { LLMService } from '../services/LLMService';
import { SnapshotService } from '../services/SnapshotService';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Fetch branches for a repository (used before connecting)
router.post('/branches', async (req: AuthenticatedRequest, res) => {
  try {
    const { repoName, githubToken } = req.body;

    if (!repoName || !githubToken) {
      return res.status(400).json({ error: 'Repository name and GitHub token are required' });
    }

    const repoParser = new RepoParserService();
    const branches = await repoParser.fetchBranches(repoName, githubToken);

    res.json({ branches });
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({
      error: 'Failed to fetch branches',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const projects = await ProjectService.getProjectsByUserId(req.userId);
    // Don't return github_token in response for security
    const sanitizedProjects = projects.map(({ github_token, ...project }) => project);
    res.json({ projects: sanitizedProjects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({
      error: 'Failed to fetch projects',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const project = await ProjectService.getProjectById(id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify project belongs to authenticated user
    if (project.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Don't return github_token in response
    const { github_token, ...sanitizedProject } = project;
    res.json({ project: sanitizedProject });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({
      error: 'Failed to fetch project',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    const project = await ProjectService.getProjectById(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify project belongs to authenticated user
    if (project.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await SnapshotService.deleteSnapshotsByProjectId(id);
    await ProjectService.deleteProject(id);

    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({
      error: 'Failed to delete project',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/:id/generate', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    const project = await ProjectService.getProjectById(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify project belongs to authenticated user
    if (project.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Retrieve token from database
    if (!project.github_token) {
      return res.status(400).json({ error: 'GitHub token not found. Please reconnect your repository.' });
    }

    const repoParser = new RepoParserService();
    // Use stored branch, or auto-detect if not set
    const treeResponse = await repoParser.fetchRepoTree(
      project.repo_name,
      project.github_token,
      project.branch
    );
    const repoStructure = repoParser.normalizeRepoStructure(treeResponse);

    const llmService = new LLMService();
    const architectureMarkdown = await llmService.generateArchitectureMarkdown({
      repoName: project.repo_name,
      repoStructure,
    });

    const snapshot = await SnapshotService.createSnapshot(project.id, architectureMarkdown);

    res.json({
      success: true,
      snapshot,
      message: 'Architecture documentation generated successfully',
    });
  } catch (error) {
    console.error('Error generating architecture:', error);
    res.status(500).json({
      error: 'Failed to generate architecture',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export { router as projectRoutes };
