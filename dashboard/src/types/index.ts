export interface AgentData {
  name: string;
  status: 'idle' | 'thinking' | 'working' | 'completed' | 'error';
  current_task: string;
  progress: number;
  last_update: string;
  color: string;
}

export interface DashboardState {
  agents: AgentData[];
  active_task: string;
  tasks_completed: number;
  skills_created: number;
  kairos_heartbeat: string;
  token_usage: number;
  logs: string[];
  preview_text?: string;
  // Real task + reverse timer
  current_goal?: string;
  started_at?: string;
  estimated_duration_seconds?: number;
  time_remaining_seconds?: number;
  real_artifacts?: string[];
  real_result?: string;
  task_running?: boolean;
  task_completed?: boolean;
}
