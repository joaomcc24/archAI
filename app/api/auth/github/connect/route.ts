import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { ProjectService } from '@/lib/services/ProjectService';
import { billingService } from '@/lib/services/BillingService';
import { trackServerEvent, AnalyticsEvents } from '@/lib/analytics-server';
import { validateRequestBody, githubConnectSchema, formatZodError } from '@/lib/validation';
import { formatErrorResponse, ValidationError, LimitExceededError } from '@/lib/errors';
import '@/lib/env-validation'; // Validate env vars on module load

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) return auth.error;

    // Validate request body
    const validation = await validateRequestBody(request, githubConnectSchema);
    if (!validation.success) {
      const zodError = formatZodError(validation.error);
      const error = new ValidationError(zodError.error, zodError.fields);
      return NextResponse.json(formatErrorResponse(error), { status: error.statusCode });
    }

    const { repoName, branch } = validation.data;
    const githubToken = request.cookies.get('gh_token')?.value;
    if (!githubToken) {
      return NextResponse.json(
        formatErrorResponse(new Error('GitHub token not found. Please reconnect your repository.')),
        { status: 400 }
      );
    }

    // Check repository limit before connecting
    const limitCheck = await billingService.checkLimit(auth.user.id, 'repos');

    if (!limitCheck.allowed) {
      const error = new LimitExceededError(
        'repositories',
        limitCheck.current,
        limitCheck.limit,
        `Repository limit reached. You've connected ${limitCheck.current} of ${limitCheck.limit} repositories. Upgrade to Pro to connect more repositories.`
      );
      return NextResponse.json(formatErrorResponse(error), { status: error.statusCode });
    }

    // Get repo details
    const repoResponse = await fetch(`https://api.github.com/repos/${repoName}`, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
      },
    });
    const repo = await repoResponse.json();
    const installationId = repo.id.toString();

    // Use provided branch or default to repo's default branch
    const selectedBranch = branch || repo.default_branch;

    // Create project
    const project = await ProjectService.createProject(
      auth.user.id,
      repoName,
      installationId,
      githubToken,
      selectedBranch
    );

    // Track analytics event
    await trackServerEvent(AnalyticsEvents.PROJECT_CONNECTED, {
      project_id: project.id,
      repo_name: repoName,
      branch: selectedBranch,
    }, auth.user.id);

    const response = NextResponse.json({
      success: true,
      project,
    });
    response.cookies.set({
      name: 'gh_token',
      value: '',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0,
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('GitHub connect error:', error);
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}
