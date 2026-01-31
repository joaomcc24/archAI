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

    const { repoName, githubToken, branch } = validation.data;

    // #region agent log
    try{const fs=await import('fs');fs.appendFileSync('/Users/joaocardoso/SaaS/archassistant/.cursor/debug.log',JSON.stringify({location:'app/api/auth/github/connect/route.ts:23',message:'Before limit check',data:{userId:auth.user.id,repoName,limitType:'repos'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C'})+'\n');}catch(e){}
    // #endregion

    // Check repository limit before connecting
    const limitCheck = await billingService.checkLimit(auth.user.id, 'repos');
    
    // #region agent log
    try{const fs=await import('fs');fs.appendFileSync('/Users/joaocardoso/SaaS/archassistant/.cursor/debug.log',JSON.stringify({location:'app/api/auth/github/connect/route.ts:27',message:'Limit check result',data:{allowed:limitCheck.allowed,current:limitCheck.current,limit:limitCheck.limit},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C'})+'\n');}catch(e){}
    // #endregion

    if (!limitCheck.allowed) {
      // #region agent log
      try{const fs=await import('fs');fs.appendFileSync('/Users/joaocardoso/SaaS/archassistant/.cursor/debug.log',JSON.stringify({location:'app/api/auth/github/connect/route.ts:30',message:'Limit exceeded - returning 403',data:{current:limitCheck.current,limit:limitCheck.limit,comparison:`${limitCheck.current} < ${limitCheck.limit} = ${limitCheck.current < limitCheck.limit}`},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})+'\n');}catch(e){}
      // #endregion
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

    return NextResponse.json({
      success: true,
      project,
    });
  } catch (error) {
    console.error('GitHub connect error:', error);
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}
