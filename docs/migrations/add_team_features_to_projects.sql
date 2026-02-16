-- Add team collaboration features to projects table
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_is_shared ON projects(is_shared);

-- Function to update is_shared when members are added/removed
CREATE OR REPLACE FUNCTION update_project_is_shared()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if project has more than one member (owner + others)
  UPDATE projects
  SET is_shared = (
    SELECT COUNT(*) > 1
    FROM project_members
    WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
  )
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update is_shared when members change
DROP TRIGGER IF EXISTS trigger_update_project_is_shared ON project_members;
CREATE TRIGGER trigger_update_project_is_shared
  AFTER INSERT OR UPDATE OR DELETE ON project_members
  FOR EACH ROW
  EXECUTE FUNCTION update_project_is_shared();
