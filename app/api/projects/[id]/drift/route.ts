import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { ProjectService } from '@/lib/services/ProjectService';
import { RepoParserService } from '@/lib/services/RepoParserService';
import { SnapshotService } from '@/lib/services/SnapshotService';
import { DriftDetectionService } from '@/lib/services/DriftDetectionService';
import { trackServerEvent, AnalyticsEvents } from '@/lib/analytics-server';
import { rateLimiters } from '@/lib/rate-limit';
import { validateParams, projectIdSchema, formatZodError } from '@/lib/validation';
import { formatErrorResponse, NotFoundError, AuthorizationError, ExternalServiceError } from '@/lib/errors';
import '@/lib/env-validation'; // Validate env vars on module load

// POST /api/projects/[id]/drift - Detect drift between current repo and latest snapshot
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) return auth.error;

    // Apply rate limiting for drift detection (computationally expensive)
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

    const { id } = await params;
    
    // Validate project ID
    const paramValidation = validateParams({ id }, projectIdSchema);
    if (!paramValidation.success) {
      const zodError = formatZodError(paramValidation.error);
      return NextResponse.json(
        formatErrorResponse(new Error(zodError.error)),
        { status: 400 }
      );
    }

    const project = await ProjectService.getProjectById(paramValidation.data.id);

    if (!project) {
      const error = new NotFoundError('Project');
      return NextResponse.json(formatErrorResponse(error), { status: error.statusCode });
    }

    if (project.user_id !== auth.user.id) {
      const error = new AuthorizationError('You do not have access to this project');
      return NextResponse.json(formatErrorResponse(error), { status: error.statusCode });
    }

    if (!project.github_token) {
      return NextResponse.json(
        formatErrorResponse(new Error('GitHub token not found. Please reconnect your repository.')),
        { status: 400 }
      );
    }

    // Check if project has at least one snapshot (can't detect drift without baseline)
    const latestSnapshot = await SnapshotService.getLatestSnapshot(project.id);
    if (!latestSnapshot) {
      return NextResponse.json(
        formatErrorResponse(new Error('No snapshots found. Please generate a snapshot first before detecting drift.')),
        { status: 400 }
      );
    }

    let currentRepoStructure;
    let currentArchitectureMarkdown;

    // Fetch current repo structure
    try {
      const repoParser = new RepoParserService();
      const treeResponse = await repoParser.fetchRepoTree(
        project.repo_name,
        project.github_token,
        project.branch
      );
      currentRepoStructure = repoParser.normalizeRepoStructure(treeResponse);
    } catch (error) {
      const serviceError = new ExternalServiceError(
        'GitHub',
        error instanceof Error ? error.message : 'Failed to fetch current repository structure'
      );
      return NextResponse.json(formatErrorResponse(serviceError), { status: serviceError.statusCode });
    }

    // Generate current architecture markdown for comparison
    // Note: In a production system, you might want to cache this or make it optional
    try {
      const { LLMService } = await import('@/lib/services/LLMService');
      const llmService = new LLMService();
      currentArchitectureMarkdown = await llmService.generateArchitectureMarkdown({
        repoName: project.repo_name,
        repoStructure: currentRepoStructure,
      });
    } catch (error) {
      const serviceError = new ExternalServiceError(
        'LLM',
        error instanceof Error ? error.message : 'Failed to generate current architecture documentation'
      );
      return NextResponse.json(formatErrorResponse(serviceError), { status: serviceError.statusCode });
    }

    // Get previous repo structure from snapshot (if stored) or null
    const previousRepoStructure = latestSnapshot.repo_structure || null;
    const previousArchitectureMarkdown = latestSnapshot.markdown;

    // Perform drift detection
    const driftService = new DriftDetectionService();
    const driftResult = await driftService.detectDrift(
      project.id,
      currentRepoStructure,
      latestSnapshot.id,
      previousRepoStructure,
      currentArchitectureMarkdown,
      previousArchitectureMarkdown
    );

    // Track analytics event
    await trackServerEvent(AnalyticsEvents.DRIFT_DETECTED, {
      project_id: project.id,
      repo_name: project.repo_name,
      snapshot_id: latestSnapshot.id,
      drift_result_id: driftResult.id,
      drift_score: driftResult.drift_score,
      file_changes_count: 
        driftResult.file_changes.added.length +
        driftResult.file_changes.removed.length +
        driftResult.file_changes.modified.length,
    }, auth.user.id);

    return NextResponse.json({
      success: true,
      drift: {
        id: driftResult.id,
        drift_score: driftResult.drift_score,
        file_changes: driftResult.file_changes,
        structure_diff: driftResult.structure_diff,
        architecture_diff: driftResult.architecture_diff,
        created_at: driftResult.created_at,
      },
      message: 'Drift detection completed successfully',
    });
  } catch (error) {
    console.error('Error detecting drift:', error);
    
    // Capture error in Sentry
    if (error instanceof Error) {
      const { captureException } = await import('@/lib/monitoring');
      captureException(error, {
        endpoint: '/api/projects/[id]/drift',
        userId: 'unknown', // Will be set if auth succeeded
      });
    }
    
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}

// GET /api/projects/[id]/drift - Get drift results for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) return auth.error;

    const { id } = await params;
    
    // Validate project ID
    const paramValidation = validateParams({ id }, projectIdSchema);
    if (!paramValidation.success) {
      const zodError = formatZodError(paramValidation.error);
      return NextResponse.json(
        formatErrorResponse(new Error(zodError.error)),
        { status: 400 }
      );
    }

    const project = await ProjectService.getProjectById(paramValidation.data.id);

    if (!project) {
      const error = new NotFoundError('Project');
      return NextResponse.json(formatErrorResponse(error), { status: error.statusCode });
    }

    if (project.user_id !== auth.user.id) {
      const error = new AuthorizationError('You do not have access to this project');
      return NextResponse.json(formatErrorResponse(error), { status: error.statusCode });
    }

    // Get all drift results for this project
    const driftResults = await DriftDetectionService.getDriftResultsByProjectId(project.id);

    return NextResponse.json({
      success: true,
      drift_results: driftResults.map((drift) => ({
        id: drift.id,
        snapshot_id: drift.snapshot_id,
        drift_score: drift.drift_score,
        file_changes: drift.file_changes,
        created_at: drift.created_at,
        completed_at: drift.completed_at,
      })),
    });
  } catch (error) {
    console.error('Error fetching drift results:', error);
    
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}
