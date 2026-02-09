import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthenticatedUser } from './auth';
import { ProjectMembershipService } from './services/ProjectMembershipService';
import { NotFoundError, AuthorizationError } from './errors';

export interface ProjectAccessResult {
  user: AuthenticatedUser;
  role: 'owner' | 'member' | 'viewer';
}

/**
 * Check if user has required access level to a project
 * Returns user and role if access is granted, or an error response
 */
export async function checkProjectAccess(
  request: NextRequest,
  projectId: string,
  requiredRole: 'owner' | 'member' | 'viewer'
): Promise<ProjectAccessResult | { error: NextResponse }> {
  // First authenticate the request
  const auth = await authenticateRequest(request);
  if ('error' in auth) {
    return auth;
  }

  // Get user's role in the project
  const userRole = await ProjectMembershipService.getUserRole(projectId, auth.user.id);

  if (!userRole) {
    return {
      error: NextResponse.json(
        { error: 'Access denied: You do not have access to this project' },
        { status: 403 }
      ),
    };
  }

  // Check if user has required role level
  const roleHierarchy: Record<string, number> = {
    owner: 3,
    member: 2,
    viewer: 1,
  };

  if (roleHierarchy[userRole] < roleHierarchy[requiredRole]) {
    return {
      error: NextResponse.json(
        { error: `Access denied: This action requires ${requiredRole} access or higher` },
        { status: 403 }
      ),
    };
  }

  return {
    user: auth.user,
    role: userRole,
  };
}

/**
 * Check if user is owner of a project
 */
export async function checkProjectOwner(
  request: NextRequest,
  projectId: string
): Promise<AuthenticatedUser | { error: NextResponse }> {
  const access = await checkProjectAccess(request, projectId, 'owner');
  if ('error' in access) {
    return access;
  }
  return access.user;
}
