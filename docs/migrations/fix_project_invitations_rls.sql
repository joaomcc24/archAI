-- Fix recursive RLS policies for project_invitations

DROP POLICY IF EXISTS "Owners can view project invitations" ON public.project_invitations;
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.project_invitations;
DROP POLICY IF EXISTS "Owners can manage invitations" ON public.project_invitations;

CREATE POLICY "Owners can view project invitations" ON public.project_invitations
  FOR SELECT USING (
    public.is_project_owner(project_id, auth.uid())
  );

CREATE POLICY "Anyone can view invitation by token" ON public.project_invitations
  FOR SELECT USING (
    token = current_setting('request.jwt.claims', true)::json->>'invitation_token'
    OR public.is_project_owner(project_id, auth.uid())
  );

CREATE POLICY "Owners can manage invitations" ON public.project_invitations
  FOR ALL USING (
    public.is_project_owner(project_id, auth.uid())
  );
