import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { AuthenticatedRequest } from '../middleware/auth';
import { ProjectService } from '../services/ProjectService';
import { SnapshotService } from '../services/SnapshotService';
import { TaskService } from '../services/TaskService';
import { Task } from '../types/database';

const router = Router();

// Generate a new task from architecture documentation
router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { snapshotId, description } = req.body;

    if (!snapshotId || !description) {
      return res.status(400).json({ error: 'Snapshot ID and description are required' });
    }

    if (typeof description !== 'string' || description.trim().length < 10) {
      return res.status(400).json({ error: 'Description must be at least 10 characters' });
    }

    // Get the snapshot
    const snapshot = await SnapshotService.getSnapshotById(snapshotId);
    if (!snapshot) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }

    // Get the project and verify ownership
    const project = await ProjectService.getProjectById(snapshot.project_id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Generate task using TaskService
    const taskService = new TaskService();
    const generatedTask = await taskService.generateTask({
      architectureMarkdown: snapshot.markdown,
      featureDescription: description.trim(),
      repoName: project.repo_name,
    });

    // Save task to database
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        project_id: project.id,
        snapshot_id: snapshotId,
        title: generatedTask.title,
        description: description.trim(),
        markdown: generatedTask.markdown,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error saving task:', error);
      throw new Error('Failed to save task to database');
    }

    res.json({
      success: true,
      task: data as Task,
      message: 'Task generated successfully',
    });
  } catch (error) {
    console.error('Error generating task:', error);
    res.status(500).json({
      error: 'Failed to generate task',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get all tasks for the current user (across all projects)
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get all projects for this user
    const projects = await ProjectService.getProjectsByUserId(req.userId);
    const projectIds = projects.map(p => p.id);

    if (projectIds.length === 0) {
      return res.json({ tasks: [] });
    }

    // Get all tasks for these projects
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch tasks');
    }

    // Add project info to each task
    const tasksWithProject = (data as Task[]).map(task => {
      const project = projects.find(p => p.id === task.project_id);
      return {
        ...task,
        project_name: project?.repo_name || 'Unknown',
      };
    });

    res.json({ tasks: tasksWithProject });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      error: 'Failed to fetch tasks',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get all tasks for a project
router.get('/project/:projectId', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { projectId } = req.params;

    // Verify project ownership
    const project = await ProjectService.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch tasks');
    }

    res.json({ tasks: data as Task[] });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      error: 'Failed to fetch tasks',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get all tasks for a snapshot
router.get('/snapshot/:snapshotId', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { snapshotId } = req.params;

    // Verify snapshot ownership through project
    const snapshot = await SnapshotService.getSnapshotById(snapshotId);
    if (!snapshot) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }

    const project = await ProjectService.getProjectById(snapshot.project_id);
    if (!project || project.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('snapshot_id', snapshotId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch tasks');
    }

    res.json({ tasks: data as Task[] });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      error: 'Failed to fetch tasks',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get a specific task by ID
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { id } = req.params;

    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Verify ownership through project
    const project = await ProjectService.getProjectById(task.project_id);
    if (!project || project.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ task: task as Task });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({
      error: 'Failed to fetch task',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Delete a task
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { id } = req.params;

    // Get the task first
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Verify ownership through project
    const project = await ProjectService.getProjectById(task.project_id);
    if (!project || project.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw new Error('Failed to delete task');
    }

    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      error: 'Failed to delete task',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export { router as taskRoutes };
