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
}
