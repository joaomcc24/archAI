-- Create project_invitations table for team collaboration
CREATE TABLE IF NOT EXISTS project_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('member', 'viewer')),
  token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_invitations_project_id ON project_invitations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_invitations_token ON project_invitations(token);
CREATE INDEX IF NOT EXISTS idx_project_invitations_email ON project_invitations(email);

-- Unique constraint: one pending invitation per project-email pair
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_invitations_unique_pending
  ON project_invitations(project_id, email)
  WHERE accepted_at IS NULL;

-- Enable RLS
ALTER TABLE project_invitations ENABLE ROW LEVEL SECURITY;

-- Owners can view invitations for their projects
CREATE POLICY "Owners can view project invitations" ON project_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_invitations.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'owner'
    )
  );

-- Anyone with valid token can view invitation (for acceptance page)
CREATE POLICY "Anyone can view invitation by token" ON project_invitations
  FOR SELECT USING (
    token = current_setting('request.jwt.claims', true)::json->>'invitation_token'
    OR EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_invitations.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'owner'
    )
  );

-- Only owners can create/delete invitations
CREATE POLICY "Owners can manage invitations" ON project_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_invitations.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'owner'
    )
  );

-- Note: Service role bypasses RLS, so it can manage invitations without policies
