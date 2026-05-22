import React from 'react';

interface StatsRingProps {
  label: string;
  value: number;
  max?: number;
  unit?: string;
  color: string;
}

export const StatsRing: React.FC<StatsRingProps> = ({
  label,
  value,
  max = 100,
  unit = '',
  color,
}) => {
  const percentage = (value / max) * 100;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="120" height="120" className="transform -rotate-90">
        {/* Background ring */}
        <circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke="#1a1a2e"
          strokeWidth="8"
        />
        {/* Progress ring */}
        <circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: 'stroke-dashoffset 0.5s ease-out',
            filter: `drop-shadow(0 0 8px ${color})`,
          }}
          strokeLinecap="round"
        />
      </svg>
      <div className="text-center">
        <div className="text-lg font-bold text-white">{value}</div>
        <div className="text-xs text-gray-400">{label}</div>
      </div>
    </div>
  );
};

interface MetricsDisplayProps {
  tasksCompleted: number;
  skillsCreated: number;
  tokenUsage: number;
  kairosStatus: string;
}

export const MetricsDisplay: React.FC<MetricsDisplayProps> = ({
  tasksCompleted,
  skillsCreated,
  tokenUsage,
  kairosStatus,
}) => {
  return (
    <div className="grid grid-cols-2 gap-4 p-4 bg-gradient-to-br from-blue-950 to-purple-950 rounded-lg border border-cyan-500 border-opacity-30 shadow-lg">
      <StatsRing
        label="Tasks"
        value={tasksCompleted}
        max={100}
        color="#00f0ff"
      />
      <StatsRing
        label="Skills"
        value={skillsCreated}
        max={50}
        color="#a855f7"
      />
      <StatsRing
        label="Tokens"
        value={Math.min(tokenUsage / 1000, 100)}
        max={100}
        unit="K"
        color="#22c55e"
      />
      <div className="flex items-center justify-center p-4 bg-blue-950 bg-opacity-50 rounded border border-cyan-500 border-opacity-20">
        <div className="text-center">
          <div className="text-2xl font-bold text-cyan-400">{kairosStatus}</div>
          <div className="text-xs text-gray-400 mt-1">KAIROS Status</div>
        </div>
      </div>
    </div>
  );
};
