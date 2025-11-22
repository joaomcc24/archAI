import { Router } from 'express';
import { ProjectService } from '../services/ProjectService';
import { RepoParserService } from '../services/RepoParserService';
import { LLMService } from '../services/LLMService';
import { SnapshotService } from '../services/SnapshotService';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const projects = await ProjectService.getProjectsByUserId(userId);
    res.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({
      error: 'Failed to fetch projects',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const project = await ProjectService.getProjectById(id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ project });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({
      error: 'Failed to fetch project',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const project = await ProjectService.getProjectById(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
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

router.post('/:id/generate', async (req, res) => {
  try {
    const { id } = req.params;
    const { githubToken } = req.body;

    if (!githubToken) {
      return res.status(400).json({ error: 'GitHub access token is required' });
    }

    const project = await ProjectService.getProjectById(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const repoParser = new RepoParserService();
    const treeResponse = await repoParser.fetchRepoTree(project.repo_name, githubToken);
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
