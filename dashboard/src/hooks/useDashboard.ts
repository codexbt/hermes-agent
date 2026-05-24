import { useState, useEffect, useCallback, useRef } from 'react';
import { AgentData, DashboardState } from '../types';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8001/ws/dashboard';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

export interface DashboardEvent {
  type: 'agent_update' | 'log_update' | 'metrics_update' | 'particle_effect' | 'new_goal';
  timestamp: string;
  data?: any;
}

export const useDashboard = () => {
  const [state, setState] = useState<DashboardState>({
    agents: [],
    active_task: 'Awaiting commands...',
    tasks_completed: 0,
    skills_created: 0,
    kairos_heartbeat: new Date().toISOString(),
    token_usage: 0,
    logs: [],
  });

  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<DashboardEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Connect to WebSocket
  useEffect(() => {
    const connect = () => {
      try {
        const ws = new WebSocket(WS_URL);

        ws.onopen = () => {
          console.log('✅ Connected to dashboard WebSocket');
          setConnected(true);
          // Request current state
          fetch(`${API_URL}/api/status`)
            .then((res) => res.json())
            .then((data) => setState(data))
            .catch((err) => console.error('Failed to fetch initial state:', err));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setLastEvent(data);

            // Update state based on event type
            setState((prev) => {
              if (data.type === 'agent_update' && data.full_state) {
                return data.full_state;
              }
              if (data.type === 'log_update' && data.data) {
                return { ...prev, logs: data.data };
              }
              if (data.type === 'agent_update' && data.data) {
                const updatedAgents = prev.agents.map((a) =>
                  a.name === data.data.name ? data.data : a
                );
                return { ...prev, agents: updatedAgents };
              }
                if ((data.type === 'new_goal' || data.type === 'metrics_update' || data.type === 'timer_tick' || data.type === 'task_complete' || data.type === 'task_error') && data.full_state) {
                  return data.full_state;
                }
                return prev;
            });
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setConnected(false);
        };

        ws.onclose = () => {
          console.log('❌ Disconnected from dashboard WebSocket');
          setConnected(false);
          // Attempt reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        };

        wsRef.current = ws;
      } catch (err) {
        console.error('Failed to create WebSocket:', err);
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const triggerGoal = useCallback(async (goal: string, mode: 'task' | 'chat' = 'task') => {
    try {
      const response = await fetch(`${API_URL}/api/trigger_goal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, mode }),
      });
      const result = await response.json();
      console.log('Goal triggered:', result);
      return result;
    } catch (err) {
      console.error('Failed to trigger goal:', err);
      throw err;
    }
  }, []);

  const updateAgent = useCallback(async (agent: AgentData) => {
    try {
      const response = await fetch(`${API_URL}/api/update_agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agent),
      });
      const result = await response.json();
      return result;
    } catch (err) {
      console.error('Failed to update agent:', err);
      throw err;
    }
  }, []);

  return {
    state,
    connected,
    lastEvent,
    triggerGoal,
    updateAgent,
  };
};
