import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { ProjectService } from '@/lib/services/ProjectService';
import { RepoParserService } from '@/lib/services/RepoParserService';
import { LLMService } from '@/lib/services/LLMService';
import { SnapshotService } from '@/lib/services/SnapshotService';

// POST /api/projects/[id]/generate - Generate architecture documentation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) return auth.error;

    const { id } = await params;
    const project = await ProjectService.getProjectById(id);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.user_id !== auth.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!project.github_token) {
      return NextResponse.json(
        { error: 'GitHub token not found. Please reconnect your repository.' },
        { status: 400 }
      );
    }

    const repoParser = new RepoParserService();
    const treeResponse = await repoParser.fetchRepoTree(
      project.repo_name,
      project.github_token,
      project.branch
    );
    const repoStructure = repoParser.normalizeRepoStructure(treeResponse);

    const llmService = new LLMService();
    const architectureMarkdown = await llmService.generateArchitectureMarkdown({
      repoName: project.repo_name,
      repoStructure,
    });

    const snapshot = await SnapshotService.createSnapshot(project.id, architectureMarkdown);

    return NextResponse.json({
      success: true,
      snapshot,
      message: 'Architecture documentation generated successfully',
    });
  } catch (error) {
    console.error('Error generating architecture:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate architecture',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
