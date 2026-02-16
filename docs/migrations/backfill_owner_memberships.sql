-- Backfill owner memberships for all existing projects
-- This migration ensures all existing projects have an owner in project_members table

INSERT INTO project_members (project_id, user_id, role, invited_at, joined_at, created_at)
SELECT 
  id as project_id,
  user_id,
  'owner' as role,
  created_at as invited_at,
  created_at as joined_at,
  created_at
FROM projects
WHERE NOT EXISTS (
  SELECT 1 FROM project_members pm
  WHERE pm.project_id = projects.id
  AND pm.user_id = projects.user_id
  AND pm.role = 'owner'
)
ON CONFLICT (project_id, user_id) DO NOTHING;
