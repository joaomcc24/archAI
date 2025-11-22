import { Router } from 'express';
import { SnapshotService } from '../services/SnapshotService';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const projectId = req.query.projectId as string;
    
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
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

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const snapshot = await SnapshotService.getSnapshotById(id);

    if (!snapshot) {
      return res.status(404).json({ error: 'Snapshot not found' });
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

router.get('/project/:projectId/latest', async (req, res) => {
  try {
    const { projectId } = req.params;
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








