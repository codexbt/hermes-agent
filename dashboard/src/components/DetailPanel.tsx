import React from 'react';
import { X, Maximize2 } from 'lucide-react';
import { AgentData } from '../types';
import { useStore } from '../hooks/useStore';

interface DetailPanelProps {
  agent: AgentData | null;
  onClose: () => void;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({ agent, onClose }) => {
  const { setFullscreen } = useStore();

  if (!agent) return null;

  const statusEmoji: Record<string, string> = {
    idle: '⏸️',
    thinking: '🤔',
    working: '⚙️',
    completed: '✅',
    error: '❌',
  };

  return (
    <div className="fixed top-4 right-4 w-96 max-h-96 bg-gradient-to-br from-blue-950 to-purple-950 rounded-lg border border-cyan-500 border-opacity-50 shadow-2xl overflow-hidden z-40">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 border-b border-cyan-500 border-opacity-30"
        style={{ backgroundColor: agent.color + '20' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-4 h-4 rounded-full animate-pulse"
            style={{ backgroundColor: agent.color }}
          ></div>
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">
            {agent.name}
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFullscreen(true)}
            className="p-1 hover:bg-white hover:bg-opacity-10 rounded"
          >
            <Maximize2 size={16} className="text-cyan-400" />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white hover:bg-opacity-10 rounded"
          >
            <X size={16} className="text-cyan-400" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Status */}
        <div className="flex items-center gap-3">
          <span className="text-2xl">{statusEmoji[agent.status]}</span>
          <div>
            <div className="text-xs text-gray-400 uppercase">Status</div>
            <div className="text-lg font-semibold text-white capitalize">
              {agent.status}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-400 uppercase">Progress</span>
            <span className="text-sm text-cyan-400 font-semibold">
              {Math.round(agent.progress)}%
            </span>
          </div>
          <div className="w-full h-2 bg-blue-950 rounded-full overflow-hidden border border-cyan-500 border-opacity-20">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${agent.progress}%`,
                backgroundColor: agent.color,
                boxShadow: `0 0 10px ${agent.color}`,
              }}
            ></div>
          </div>
        </div>

        {/* Current Task */}
        <div>
          <div className="text-xs text-gray-400 uppercase mb-2">Current Task</div>
          <div className="p-3 bg-blue-950 bg-opacity-50 rounded border border-cyan-500 border-opacity-20 text-sm text-white font-mono line-clamp-4">
            {agent.current_task || 'No active task'}
          </div>
        </div>

        {/* Last Update */}
        <div className="text-xs text-gray-500 flex justify-between">
          <span>Last Update:</span>
          <span>{new Date(agent.last_update).toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};
