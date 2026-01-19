import { Router } from 'express';
import { SnapshotService } from '../services/SnapshotService';
import { ProjectService } from '../services/ProjectService';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const projectId = req.query.projectId as string;
    
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    if (!req.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Verify project belongs to user
    const project = await ProjectService.getProjectById(projectId);
    if (!project || project.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const snapshots = await SnapshotService.getSnapshotsByProjectId(projectId);
    res.json({ snapshots });
  } catch (error) {
    console.error('Error fetching snapshots:', error);
    res.status(500).json({
      error: 'Failed to fetch snapshots',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const snapshot = await SnapshotService.getSnapshotById(id);

    if (!snapshot) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }

    if (!req.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Verify project belongs to user
    const project = await ProjectService.getProjectById(snapshot.project_id);
    if (!project || project.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ snapshot });
  } catch (error) {
    console.error('Error fetching snapshot:', error);
    res.status(500).json({
      error: 'Failed to fetch snapshot',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/project/:projectId/latest', async (req: AuthenticatedRequest, res) => {
  try {
    const { projectId } = req.params;
    
    if (!req.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Verify project belongs to user
    const project = await ProjectService.getProjectById(projectId);
    if (!project || project.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const snapshot = await SnapshotService.getLatestSnapshot(projectId);

    if (!snapshot) {
      return res.status(404).json({ error: 'No snapshots found for this project' });
    }

    res.json({ snapshot });
  } catch (error) {
    console.error('Error fetching latest snapshot:', error);
    res.status(500).json({
      error: 'Failed to fetch latest snapshot',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export { router as snapshotRoutes };










