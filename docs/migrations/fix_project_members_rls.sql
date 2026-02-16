-- Fix recursive RLS policies by using security definer helpers

-- Helper: check if user is a member of a project
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.project_members
    WHERE project_id = p_project_id
      AND user_id = p_user_id
  );
END;
$$;

-- Helper: check if user is owner of a project
CREATE OR REPLACE FUNCTION public.is_project_owner(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.project_members
    WHERE project_id = p_project_id
      AND user_id = p_user_id
      AND role = 'owner'
  );
END;
$$;

DROP POLICY IF EXISTS "Users can view members of their projects" ON public.project_members;
DROP POLICY IF EXISTS "Owners can manage members" ON public.project_members;

CREATE POLICY "Users can view members of their projects" ON public.project_members
  FOR SELECT USING (
    public.is_project_member(project_id, auth.uid())
  );

CREATE POLICY "Owners can manage members" ON public.project_members
  FOR ALL USING (
    public.is_project_owner(project_id, auth.uid())
  );
