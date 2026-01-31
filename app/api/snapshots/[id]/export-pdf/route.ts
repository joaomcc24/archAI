import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { SnapshotService } from '@/lib/services/SnapshotService';
import { ProjectService } from '@/lib/services/ProjectService';
import { billingService } from '@/lib/services/BillingService';
import { formatErrorResponse, NotFoundError, AuthorizationError } from '@/lib/errors';
import { validateParams, snapshotIdSchema, formatZodError } from '@/lib/validation';
import '@/lib/env-validation'; // Validate env vars on module load

// POST /api/snapshots/[id]/export-pdf - Export snapshot as PDF
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) return auth.error;

    const { id } = await params;
    
    // Validate snapshot ID
    const paramValidation = validateParams({ id }, snapshotIdSchema);
    if (!paramValidation.success) {
      const zodError = formatZodError(paramValidation.error);
      return NextResponse.json(
        formatErrorResponse(new Error(zodError.error)),
        { status: 400 }
      );
    }

    const snapshot = await SnapshotService.getSnapshotById(paramValidation.data.id);
    if (!snapshot) {
      const error = new NotFoundError('Snapshot');
      return NextResponse.json(formatErrorResponse(error), { status: error.statusCode });
    }

    // Verify ownership
    const project = await ProjectService.getProjectById(snapshot.project_id);
    if (!project || project.user_id !== auth.user.id) {
      const error = new AuthorizationError('You do not have access to this snapshot');
      return NextResponse.json(formatErrorResponse(error), { status: error.statusCode });
    }

    // Check if user has Pro plan (PDF export is a Pro feature)
    const subscription = await billingService.getSubscription(auth.user.id);
    if (subscription.plan.id === 'free') {
      return NextResponse.json(
        formatErrorResponse(new Error('PDF export is only available for Pro users. Upgrade to Pro to export snapshots as PDF.')),
        { status: 403 }
      );
    }

    // Return markdown content - client will convert to PDF
    // In a production setup, you might want to do server-side PDF generation
    // For now, we'll return the markdown and let the client handle it
    return NextResponse.json({
      success: true,
      markdown: snapshot.markdown,
      repoName: project.repo_name,
      createdAt: snapshot.created_at,
    });
  } catch (error) {
    console.error('Error exporting PDF:', error);
    return NextResponse.json(formatErrorResponse(error), { status: 500 });
  }
}
