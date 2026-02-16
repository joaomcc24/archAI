-- Add repo_structure column to snapshots table
-- This allows storing the normalized repository structure alongside the markdown
-- Run this in your Supabase SQL Editor

ALTER TABLE snapshots 
ADD COLUMN IF NOT EXISTS repo_structure JSONB;

-- Add index for faster queries when filtering by repo structure
CREATE INDEX IF NOT EXISTS idx_snapshots_repo_structure ON snapshots USING GIN (repo_structure);
