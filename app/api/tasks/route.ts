import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { ProjectService } from '@/lib/services/ProjectService';
import { SnapshotService } from '@/lib/services/SnapshotService';
import { TaskService } from '@/lib/services/TaskService';
import { supabaseAdmin } from '@/lib/supabase-server';

export interface Task {
  id: string;
  project_id: string;
  snapshot_id: string;
  title: string;
  description: string;
  markdown: string;
  created_at: string;
}

// POST /api/tasks - Generate a new task
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) return auth.error;

    const { snapshotId, description } = await request.json();

    if (!snapshotId || !description) {
      return NextResponse.json(
        { error: 'Snapshot ID and description are required' },
        { status: 400 }
      );
    }

    if (typeof description !== 'string' || description.trim().length < 10) {
      return NextResponse.json(
        { error: 'Description must be at least 10 characters' },
        { status: 400 }
      );
    }

    // Get the snapshot
    const snapshot = await SnapshotService.getSnapshotById(snapshotId);
    if (!snapshot) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
    }

    // Get the project and verify ownership
    const project = await ProjectService.getProjectById(snapshot.project_id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.user_id !== auth.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Generate task using TaskService
    const taskService = new TaskService();
    const generatedTask = await taskService.generateTask({
      architectureMarkdown: snapshot.markdown,
      featureDescription: description.trim(),
      repoName: project.repo_name,
    });

    // Save task to database
    const { data, error } = await supabaseAdmin
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

    return NextResponse.json({
      success: true,
      task: data as Task,
      message: 'Task generated successfully',
    });
  } catch (error) {
    console.error('Error generating task:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate task',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET /api/tasks - Get all tasks for the current user
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) return auth.error;

    // Get all projects for this user
    const projects = await ProjectService.getProjectsByUserId(auth.user.id);
    const projectIds = projects.map((p) => p.id);

    if (projectIds.length === 0) {
      return NextResponse.json({ tasks: [] });
    }

    // Get all tasks for these projects
    const { data, error } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch tasks');
    }

    // Add project info to each task
    const tasksWithProject = (data as Task[]).map((task) => {
      const project = projects.find((p) => p.id === task.project_id);
      return {
        ...task,
        project_name: project?.repo_name || 'Unknown',
      };
    });

    return NextResponse.json({ tasks: tasksWithProject });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch tasks',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
