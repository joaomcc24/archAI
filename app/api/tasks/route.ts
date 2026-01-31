import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { ProjectService } from '@/lib/services/ProjectService';
import { SnapshotService } from '@/lib/services/SnapshotService';
import { TaskService } from '@/lib/services/TaskService';
import { billingService } from '@/lib/services/BillingService';
import { trackServerEvent, AnalyticsEvents } from '@/lib/analytics-server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { rateLimiters } from '@/lib/rate-limit';
import { validateRequestBody, generateTaskSchema, formatZodError } from '@/lib/validation';
import { formatErrorResponse, ValidationError, NotFoundError, AuthorizationError, LimitExceededError, ExternalServiceError } from '@/lib/errors';
import '@/lib/env-validation'; // Validate env vars on module load

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

    // Apply rate limiting for LLM endpoints
    const rateLimitResult = rateLimiters.llm(request, auth.user.id);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        formatErrorResponse(new Error(`Rate limit exceeded. Please try again in ${rateLimitResult.retryAfter} seconds.`)),
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(Math.ceil(rateLimitResult.resetAt / 1000)),
          },
        }
      );
    }

    // Validate request body
    const validation = await validateRequestBody(request, generateTaskSchema);
    if (!validation.success) {
      const zodError = formatZodError(validation.error);
      const error = new ValidationError(zodError.error, zodError.fields);
      return NextResponse.json(formatErrorResponse(error), { status: error.statusCode });
    }

    const { snapshotId, description } = validation.data;

    // Get the snapshot
    const snapshot = await SnapshotService.getSnapshotById(snapshotId);
    if (!snapshot) {
      const error = new NotFoundError('Snapshot');
      return NextResponse.json(formatErrorResponse(error), { status: error.statusCode });
    }

    // Get the project and verify ownership
    const project = await ProjectService.getProjectById(snapshot.project_id);
    if (!project) {
      const error = new NotFoundError('Project');
      return NextResponse.json(formatErrorResponse(error), { status: error.statusCode });
    }

    if (project.user_id !== auth.user.id) {
      const error = new AuthorizationError('You do not have access to this snapshot');
      return NextResponse.json(formatErrorResponse(error), { status: error.statusCode });
    }

    // Check task limit before generating
    const limitCheck = await billingService.checkLimit(auth.user.id, 'tasks');
    if (!limitCheck.allowed) {
      const error = new LimitExceededError(
        'task generations',
        limitCheck.current,
        limitCheck.limit,
        `Task generation limit reached. You've used ${limitCheck.current} of ${limitCheck.limit} task generations this month. Upgrade to Pro for unlimited task generations.`
      );
      return NextResponse.json(formatErrorResponse(error), { status: error.statusCode });
    }

    // Generate task using TaskService
    let generatedTask;
    try {
      const taskService = new TaskService();
      generatedTask = await taskService.generateTask({
        architectureMarkdown: snapshot.markdown,
        featureDescription: description.trim(),
        repoName: project.repo_name,
      });
    } catch (error) {
      const serviceError = new ExternalServiceError(
        'LLM',
        error instanceof Error ? error.message : 'Failed to generate task'
      );
      return NextResponse.json(formatErrorResponse(serviceError), { status: serviceError.statusCode });
    }

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

    // Track analytics event
    await trackServerEvent(AnalyticsEvents.TASK_GENERATED, {
      project_id: project.id,
      snapshot_id: snapshotId,
      task_id: (data as Task).id,
      repo_name: project.repo_name,
    }, auth.user.id);

    return NextResponse.json({
      success: true,
      task: data as Task,
      message: 'Task generated successfully',
    });
  } catch (error) {
    console.error('Error generating task:', error);
    
    // Capture error in Sentry
    if (error instanceof Error) {
      const { captureException } = await import('@/lib/monitoring');
      captureException(error, {
        endpoint: '/api/tasks',
        userId: 'unknown', // Will be set if auth succeeded
      });
    }
    
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
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
