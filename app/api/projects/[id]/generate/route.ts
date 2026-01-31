import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { ProjectService } from '@/lib/services/ProjectService';
import { RepoParserService } from '@/lib/services/RepoParserService';
import { LLMService } from '@/lib/services/LLMService';
import { SnapshotService } from '@/lib/services/SnapshotService';
import { billingService } from '@/lib/services/BillingService';
import { trackServerEvent, AnalyticsEvents } from '@/lib/analytics-server';
import { rateLimiters } from '@/lib/rate-limit';
import { validateParams, projectIdSchema, formatZodError } from '@/lib/validation';
import { formatErrorResponse, LimitExceededError, NotFoundError, AuthorizationError, ExternalServiceError } from '@/lib/errors';
import '@/lib/env-validation'; // Validate env vars on module load

// POST /api/projects/[id]/generate - Generate architecture documentation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Check snapshot limit before generating
    const limitCheck = await billingService.checkLimit(auth.user.id, 'snapshots');
    if (!limitCheck.allowed) {
      const error = new LimitExceededError(
        'snapshots',
        limitCheck.current,
        limitCheck.limit,
        `Snapshot limit reached. You've used ${limitCheck.current} of ${limitCheck.limit} snapshots this month. Upgrade to Pro for unlimited snapshots.`
      );
      return NextResponse.json(formatErrorResponse(error), { status: error.statusCode });
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

    let treeResponse;
    let repoStructure;
    let architectureMarkdown;

    try {
      const repoParser = new RepoParserService();
      treeResponse = await repoParser.fetchRepoTree(
        project.repo_name,
        project.github_token,
        project.branch
      );
      repoStructure = repoParser.normalizeRepoStructure(treeResponse);
    } catch (error) {
      const serviceError = new ExternalServiceError(
        'GitHub',
        error instanceof Error ? error.message : 'Failed to fetch repository structure'
      );
      return NextResponse.json(formatErrorResponse(serviceError), { status: serviceError.statusCode });
    }

    try {
      const llmService = new LLMService();
      architectureMarkdown = await llmService.generateArchitectureMarkdown({
        repoName: project.repo_name,
        repoStructure,
      });
    } catch (error) {
      const serviceError = new ExternalServiceError(
        'LLM',
        error instanceof Error ? error.message : 'Failed to generate architecture documentation'
      );
      return NextResponse.json(formatErrorResponse(serviceError), { status: serviceError.statusCode });
    }

    const snapshot = await SnapshotService.createSnapshot(
      project.id,
      architectureMarkdown,
      repoStructure
    );

    // Track analytics event
    await trackServerEvent(AnalyticsEvents.SNAPSHOT_GENERATED, {
      project_id: project.id,
      repo_name: project.repo_name,
      snapshot_id: snapshot.id,
    }, auth.user.id);

    return NextResponse.json({
      success: true,
      snapshot,
      message: 'Architecture documentation generated successfully',
    });
  } catch (error) {
    console.error('Error generating architecture:', error);
    
    // Capture error in Sentry
    if (error instanceof Error) {
      const { captureException } = await import('@/lib/monitoring');
      captureException(error, {
        endpoint: '/api/projects/[id]/generate',
        userId: 'unknown', // Will be set if auth succeeded
      });
    }
    
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}
