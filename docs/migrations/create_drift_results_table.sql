-- Create drift_results table for storing drift detection results
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS drift_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  snapshot_id UUID NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
  current_repo_structure JSONB,
  previous_repo_structure JSONB,
  file_changes JSONB,
  structure_diff TEXT,
  architecture_diff TEXT,
  drift_score INTEGER CHECK (drift_score >= 0 AND drift_score <= 100),
  status TEXT CHECK (status IN ('pending', 'completed', 'error')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_drift_results_project ON drift_results(project_id);
CREATE INDEX IF NOT EXISTS idx_drift_results_snapshot ON drift_results(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_drift_results_created ON drift_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_drift_results_status ON drift_results(status);

-- Enable RLS (Row Level Security)
ALTER TABLE drift_results ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own drift results (through project ownership)
CREATE POLICY "Users can view their own drift results" ON drift_results
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = drift_results.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Create policy to allow users to insert drift results for their own projects
CREATE POLICY "Users can insert drift results for their projects" ON drift_results
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = drift_results.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Create policy to allow users to update their own drift results
CREATE POLICY "Users can update their own drift results" ON drift_results
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = drift_results.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Create policy to allow users to delete their own drift results
CREATE POLICY "Users can delete their own drift results" ON drift_results
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = drift_results.project_id
      AND projects.user_id = auth.uid()
    )
  );
