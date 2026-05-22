import React, { useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';

interface TerminalFeedProps {
  logs: string[];
  maxLines?: number;
}

export const TerminalFeed: React.FC<TerminalFeedProps> = ({
  logs,
  maxLines = 12,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const displayLogs = logs.slice(-maxLines);

  return (
    <div className="bg-black bg-opacity-80 rounded-lg border border-green-500 border-opacity-40 overflow-hidden shadow-lg">
      <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-950 to-emerald-950 border-b border-green-500 border-opacity-20">
        <Terminal size={16} className="text-green-400" />
        <span className="text-xs font-mono text-green-400 uppercase tracking-wider">
          Live Activity Feed
        </span>
      </div>

      <div
        ref={containerRef}
        className="h-48 overflow-y-auto p-4 font-mono text-xs text-green-400 space-y-1 scroll-smooth"
      >
        {displayLogs.length === 0 ? (
          <div className="text-gray-600">&gt; Waiting for activity...</div>
        ) : (
          displayLogs.map((log, i) => {
            // Parse log for colors
            const isError = log.includes('[ERROR]') || log.includes('error');
            const isSuccess = log.includes('[SUCCESS]') || log.includes('✓');
            const isWarning = log.includes('[WARNING]');

            let textColor = 'text-green-400';
            if (isError) textColor = 'text-red-400';
            if (isSuccess) textColor = 'text-emerald-300';
            if (isWarning) textColor = 'text-yellow-400';

            return (
              <div key={i} className={`${textColor} line-clamp-1`}>
                <span className="text-gray-600">{'>'}</span> {log}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
