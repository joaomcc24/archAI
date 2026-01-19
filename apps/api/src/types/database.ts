export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  repo_name: string;
  installation_id: string;
  github_token?: string;
  branch?: string;
  created_at: string;
}

export interface Snapshot {
  id: string;
  project_id: string;
  markdown: string;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  snapshot_id: string;
  title: string;
  description: string;
  markdown: string;
  created_at: string;
}
