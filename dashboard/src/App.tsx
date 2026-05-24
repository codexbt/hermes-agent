import { useEffect, useState } from 'react';
import { useDashboard } from './hooks/useDashboard';
import { useStore } from './hooks/useStore';
import { Send, Target, Users, Activity, Zap } from 'lucide-react';
import { TerminalFeed } from './components/TerminalFeed';

export default function KAIROS() {
  const { state, connected, triggerGoal } = useDashboard();
  const { terminalLogs } = useStore();

  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { id: 1, type: 'ai', text: 'KAIROS ready. Send a directive.' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState('Architect');

  // Keep the preview agent aligned with the latest state
  useEffect(() => {
    if (state.agents?.length && !state.agents.some((a) => a.name === selectedAgent)) {
      setSelectedAgent(state.agents[0].name);
    }
  }, [state.agents, selectedAgent]);

  const selectedAgentData = state.agents?.find((agent) => agent.name === selectedAgent) || state.agents?.[0] || null;
  const overallProgress = state.agents?.length
    ? Math.round(state.agents.reduce((sum, agent) => sum + agent.progress, 0) / state.agents.length)
    : 0;

  // Unique Agent Display Names with short role description
  const agentDisplayMap: Record<string, string> = {
    "Orchestrator": "Aether (Orchestrator) – Coordinates the entire swarm",
    "Architect": "Obelisk (Architect) – Designs high-level system structure",
    "Coder": "Cipher (Coder) – Implements core logic and features",
    "Tester": "Vanguard (Tester) – Validates stability and catches edge cases",
    "Scribe": "Chronos (Scribe) – Documents decisions and maintains knowledge base",
  };

  // Real data from backend
  const activeAgents = state.agents?.filter(a => a.status === 'working').length || 0;
  const totalAgents = state.agents?.length || 0;

  const metrics = [
    { label: "Active Agents", value: `${activeAgents}/${totalAgents}` },
    { label: "Tasks Completed", value: state.tasks_completed || 0 },
    { label: "Skills Created", value: state.skills_created || 0 },
    { label: "Token Usage", value: (state.token_usage || 0).toLocaleString() },
    { label: "Current Task", value: state.active_task || "Idle" },
  ];

  // === REAL REVERSE TIMER + TASK RESULT ===
  const timeLeft = state.time_remaining_seconds ?? 0;
  const isRunning = state.task_running;
  const timerDisplay = isRunning || state.task_completed
    ? `${Math.floor(timeLeft / 60)}m ${timeLeft % 60}s ${state.task_completed ? '(DONE)' : 'remaining'}`
    : 'Idle';
  const realArtifacts = state.real_artifacts || [];
  const realOutput = state.real_result || '';

  const liveTasks = (state.agents || []).map((agent) => ({
    title: agent.current_task || `${agent.name} is idle`,
    category: agent.name,
    progress: agent.progress || 0,
    status: agent.status === 'working' ? 'active' : 'idle',
  }));

  // Live agents with unique display names
  const liveAgents = (state.agents || []).map(agent => ({
    displayName: agentDisplayMap[agent.name] || `${agent.name} (Agent)`,
    status: agent.status,
    currentTask: agent.current_task,
    progress: agent.progress || 0,
  }));

  const detectAssistantMode = (text: string) => {
    const normalized = text.trim().toLowerCase();
    const taskStart = /^(run|create|build|start|stop|deploy|fix|check|open|write|generate|implement|configure|install|update|refactor|review|clean|execute|setup|prepare|design|analyze|optimize|train|launch|schedule|enable|disable|compile)/;
    const chatStart = /^(what|who|how|why|when|where|is|are|can|should|could|would|will|tell|explain|describe|hi|hello|hey|thanks|thank you|please)/;
    const isQuestion = normalized.endsWith('?') || chatStart.test(normalized);
    const hasTaskTrigger = taskStart.test(normalized) || normalized.includes('task') || normalized.includes('goal');
    const hasChatTrigger = normalized.includes('how are you') || normalized.includes('what about') || normalized.includes('tell me');

    if (isQuestion && !hasTaskTrigger) return 'chat';
    if (hasTaskTrigger) return 'task';
    if (chatStart.test(normalized) && !taskStart.test(normalized)) return 'chat';
    return 'task';
  };

  const combinedLogs = [
    ...(state.logs || []),
    ...terminalLogs.filter((log) => !(state.logs || []).includes(log)),
  ].slice(-18);

  const latestUpdate = combinedLogs.length > 0 ? combinedLogs[combinedLogs.length - 1] : 'No updates yet';
  const isCompletionUpdate = /(completed|finished|built|deployed|done|success)/i.test(latestUpdate);
  const isWebsiteTask = /website|site|webapp|frontend|landing page|web page/i.test(state.active_task || latestUpdate);
  const completionStatusLabel = isCompletionUpdate ? 'TASK COMPLETED' : state.active_task && state.active_task !== 'No active swarm task' && state.active_task !== 'Idle' ? 'TASK IN PROGRESS' : 'NO ACTIVE TASK';
  const completionStatusText = isCompletionUpdate
    ? isWebsiteTask
      ? 'Website task completed successfully.'
      : 'Last task has finished. Check AI LOGS for details.'
    : state.active_task && state.active_task !== 'No active swarm task' && state.active_task !== 'Idle'
    ? `Currently executing: ${state.active_task}`
    : 'Waiting for the next directive.';
  const completionStatusStyles = isCompletionUpdate
    ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-300'
    : 'bg-amber-500/10 border-amber-400/30 text-amber-300';

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const goal = chatInput.trim();
    const mode = detectAssistantMode(goal);

    setChatMessages(prev => [...prev, { id: Date.now(), type: 'user', text: goal }] );
    setChatInput('');

    try {
      await triggerGoal(goal, mode);
    } catch (err) {
      console.error(err);
    }

    setIsTyping(true);
    setTimeout(() => {
      const responseText = mode === 'task'
        ? `Directive received. Executing the swarm action now.`
        : `Got it. KAIROS is responding to your message.`;

      setChatMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'ai',
        text: responseText,
      }] );
      setIsTyping(false);
    }, 700);
  };

  return (
    <div className="min-h-screen h-full w-full flex flex-col bg-[#0a0a0a] text-[#e5e5e5] font-sans overflow-x-hidden overflow-y-auto">
      
      {/* HEADER */}
      <header className="h-14 flex-shrink-0 border-b border-white/10 bg-[#0a0a0a] z-50">
        <div className="h-full max-w-[1600px] mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="font-serif text-3xl tracking-[-1.5px] font-medium text-white">KAIROS</div>
            <div className="px-2.5 py-0.5 text-[10px] font-mono tracking-[2px] border border-[#c17d4a] text-[#c17d4a] rounded">
              LIVE
            </div>
          </div>
          <div className={`px-3 py-1 text-xs font-mono tracking-widest border ${connected ? 'border-[#c17d4a] text-[#c17d4a]' : 'border-red-500/40 text-red-400'}`}>
            {connected ? 'CONNECTED' : 'OFFLINE'}
          </div>
        </div>
      </header>

      <div className="px-4 py-4 md:px-6 md:py-6">
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 items-stretch">

          {/* LEFT - Laser Focused */}
          <div className="flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-3 flex-shrink-0">
              <Target className="w-4 h-4 text-[#c17d4a]" />
              <h2 className="font-serif text-xl tracking-tight">Laser Focused</h2>
            </div>

            <div className="border border-white/10 bg-[#111] divide-y divide-white/10">
              {[
                { label: "Active Agents", value: `${activeAgents}/${totalAgents}` },
                { label: "Tasks Completed", value: state.tasks_completed || 0 },
                { label: "Skills Created", value: state.skills_created || 0 },
                { label: "Token Usage", value: (state.token_usage || 0).toLocaleString() },
                { label: "Current Task", value: state.active_task || "Idle" },
              ].map((m, i) => (
                <div key={i} className="px-4 py-3 flex justify-between text-sm">
                  <span className="text-white/60">{m.label}</span>
                  <span className="font-mono text-lg text-white">{m.value}</span>
                </div>
              ))}
            </div>
            <div className={`mt-3 p-4 border ${completionStatusStyles} rounded-lg`}>
              <div className="text-xs uppercase tracking-[2px]">{completionStatusLabel}</div>
              <div className="mt-2 text-sm leading-relaxed">{completionStatusText}</div>
            </div>
            <div className="mt-3 p-4 border border-white/10 rounded-lg bg-[#0d0d14]">
              <div className="text-xs uppercase tracking-[2px] text-white/40">Latest update</div>
              <div className="mt-2 text-sm text-white leading-relaxed">{latestUpdate}</div>
            </div>

            {/* === REAL REVERSE TIMER + ACTUAL TASK RESULT === */}
            <div className="mt-4 p-4 border border-[#c17d4a]/40 bg-[#111] rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <div className="text-[#c17d4a] text-xs tracking-[3px] font-mono">REAL TASK TIMER</div>
                <div className={`font-mono text-2xl font-semibold ${isRunning ? 'text-[#ff4444]' : state.task_completed ? 'text-[#22c55e]' : 'text-white/40'}`}>
                  {timerDisplay}
                </div>
              </div>
              {state.current_goal && (
                <div className="text-sm text-white/70 mb-3 line-clamp-2">Goal: {state.current_goal}</div>
              )}
              {realArtifacts.length > 0 && (
                <div className="mb-2">
                  <div className="text-[10px] text-white/50 mb-1">REAL FILES CREATED</div>
                  <div className="text-xs font-mono text-[#22c55e] space-y-0.5">
                    {realArtifacts.slice(0, 4).map((f, i) => <div key={i}>→ {f}</div>)}
                  </div>
                </div>
              )}
              {realOutput && (
                <div className="mt-2 p-2 bg-black/40 rounded text-xs font-mono text-white/80 max-h-20 overflow-auto">
                  {realOutput.slice(0, 280)}{realOutput.length > 280 ? '...' : ''}
                </div>
              )}
              {!isRunning && !state.task_completed && <div className="text-[10px] text-white/40 mt-1">Submit a goal above to run real swarm with live timer</div>}
            </div>
          </div>

          {/* CENTER - Tasks / Live Agents */}
          <div className="flex flex-col min-h-0">
            <div className="flex justify-between items-center mb-3 flex-shrink-0">
              <h2 className="font-serif text-xl tracking-tight">Active Operations</h2>
              <span className="text-xs font-mono text-white/50 tracking-widest">LIVE • {liveTasks.length}</span>
            </div>

            <div className="border border-white/10 bg-[#111] p-3 space-y-2">
              {liveTasks.length > 0 ? (
                liveTasks.map((task, i) => (
                  <div key={i} className={`p-3 border text-sm ${task.status === 'active' ? 'border-[#c17d4a] bg-[#1a1a1a]' : 'border-white/10'}`}>
                    <div className="font-medium">{task.title}</div>
                    <div className="flex justify-between text-xs mt-1 text-white/60 font-mono">
                      <span>{task.category}</span>
                      <span>{task.progress}%</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-white/40 text-sm py-6 text-center">No active operations</div>
              )}
            </div>
          </div>

          {/* RIGHT - Feeds */}
          <div className="flex flex-col min-h-0 space-y-4">
            {/* AGENT PREVIEW WINDOW */}
            <div className="flex flex-col min-h-0 border border-white/10 rounded-lg bg-[#111]">
              <div className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[2px] text-white/40">Preview Window</div>
                  <div className="font-serif text-lg tracking-tight">Completed output and current site preview</div>
                  <div className="mt-1 text-xs text-white/50">Read-only preview of current build state</div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewOpen((open) => !open)}
                  className="text-xs uppercase tracking-[2px] px-3 py-2 border border-white/10 text-white/70 hover:border-[#c17d4a] hover:text-[#c17d4a]"
                >
                  {previewOpen ? 'Collapse' : 'Expand'}
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-visible">
                {previewOpen && selectedAgentData ? (
                  <div className="flex flex-col overflow-visible">
                    <div className="overflow-visible px-4 pb-4 space-y-4 min-h-0">
                      <div className="grid grid-cols-1 gap-3 text-sm text-white/70 md:grid-cols-2">
                        <div className="rounded-lg bg-[#0b0b12] border border-white/10 p-3">
                          <div className="text-[11px] uppercase text-white/40 tracking-[2px]">Agent</div>
                          <div className="mt-2 font-medium text-white">{agentDisplayMap[selectedAgentData.name] || selectedAgentData.name}</div>
                          <div className="mt-1 text-xs text-white/50">{selectedAgentData.name}</div>
                        </div>
                        <div className="rounded-lg bg-[#0b0b12] border border-white/10 p-3">
                          <div className="text-[11px] uppercase text-white/40 tracking-[2px]">Status</div>
                          <div className="mt-2 font-medium text-white">{selectedAgentData.status.toUpperCase()}</div>
                          <div className="mt-1 text-xs text-white/50">Updated {new Date(selectedAgentData.last_update).toLocaleTimeString()}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                        <div className="rounded-lg bg-[#0b0b12] border border-white/10 p-3">
                          <div className="text-[11px] uppercase text-white/40 tracking-[2px]">Current task preview</div>
                          <div className="mt-3 text-sm leading-relaxed text-white">{selectedAgentData.current_task || 'No active task yet.'}</div>
                        </div>
                        <div className="space-y-3">
                          <div className="rounded-lg bg-[#0b0b12] border border-white/10 p-3">
                            <div className="flex items-center justify-between text-[11px] uppercase text-white/40 tracking-[2px]">
                              <span>Progress</span>
                              <span>{selectedAgentData.progress}%</span>
                            </div>
                            <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                              <div className="h-full bg-[#c17d4a] transition-all duration-300" style={{ width: `${selectedAgentData.progress}%` }} />
                            </div>
                          </div>
                          <div className="rounded-lg bg-[#0b0b12] border border-white/10 p-3">
                            <div className="flex items-center justify-between text-[11px] uppercase text-white/40 tracking-[2px]">
                              <span>Overall swarm progress</span>
                              <span>{overallProgress}%</span>
                            </div>
                            <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                              <div className="h-full bg-[#6ee7b7] transition-all duration-300" style={{ width: `${overallProgress}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {isWebsiteTask && (
                        <div className="rounded-lg bg-[#0b0b12] border border-white/10 p-3">
                          <div className="text-[11px] uppercase text-white/40 tracking-[2px]">Website output preview</div>
                          <div className="mt-3 text-sm leading-relaxed text-white/70">
                            {state.preview_text || 'The website preview is being generated. This panel will show the current page output and progress details.'}
                          </div>
                          <div className="mt-4 rounded-2xl border border-white/10 bg-[#111] p-3">
                            <div className="grid grid-cols-1 gap-2 text-xs text-white/50">
                              <div className="font-semibold text-white">Live page snapshot</div>
                              <div className="h-3 rounded bg-white/10" />
                              <div className="h-3 rounded bg-white/10" />
                              <div className="h-3 rounded bg-white/10" />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="rounded-lg bg-[#0b0b12] border border-white/10 p-3">
                        <div className="text-[11px] uppercase text-white/40 tracking-[2px]">Built outputs</div>
                        <div className="mt-3 max-h-32 overflow-y-auto text-sm text-white/70 space-y-2 pr-2">
                          {((state.logs || []).filter((log) => /(completed|built|deployed|success)/i.test(log)).slice(-5)).length ? (
                            (state.logs || []).filter((log) => /(completed|built|deployed|success)/i.test(log)).slice(-5).map((log, index) => (
                              <div key={index} className="rounded border border-white/10 bg-[#0b0b12] px-3 py-2 text-xs leading-relaxed">
                                {log}
                              </div>
                            ))
                          ) : (
                            <div className="rounded border border-dashed border-white/20 bg-[#0b0b12] px-3 py-2 text-xs text-white/50">
                              No built output is available yet. Once the website is ready, it will appear here.
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="rounded-lg bg-[#0b0b12] border border-white/10 p-3">
                        <div className="text-[11px] uppercase text-white/40 tracking-[2px]">Where to view completed output</div>
                        <div className="mt-2 text-sm text-white/60">
                          When the website is finished, this section will show the summary and output. After task completion, check this panel and the Live Activity Feed.
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-[11px] uppercase text-white/40 tracking-[2px]">Swap preview</div>
                        <div className="flex flex-wrap gap-2">
                          {(state.agents || []).map((agent) => (
                            <button
                              key={agent.name}
                              type="button"
                              onClick={() => setSelectedAgent(agent.name)}
                              className={`rounded-full px-3 py-1 text-xs font-mono border ${agent.name === selectedAgent ? 'border-[#c17d4a] bg-[#1f1a18]' : 'border-white/10 bg-white/5'} text-white/80`}
                            >
                              {agent.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="m-4 text-sm text-white/50">Preview collapsed. Expand to inspect agents and current build details.</div>
                )}
              </div>
            </div>

            {/* AI LOGS - More Detailed */}
            <div className="flex flex-col flex-1 min-h-0">
              <TerminalFeed logs={combinedLogs} maxLines={16} />
            </div>

            {/* LIVE AGENTS with Unique Names + Role */}
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex items-center gap-2 mb-2 text-sm tracking-widest text-white/60 flex-shrink-0">
                <Users className="w-4 h-4" /> SWARM STATUS
              </div>
              <div className="border border-white/10 bg-[#111] p-3 text-sm space-y-2">
                {(state.agents || []).length > 0 ? (
                  (state.agents || []).map((agent, i) => {
                    const display = agentDisplayMap[agent.name] || `${agent.name} (Agent)`;
                    return (
                      <div key={i} className="border-b border-white/10 pb-2 last:border-none">
                        <div className="font-medium">{display}</div>
                        <div className="text-xs text-white/60 mt-0.5">
                          {agent.status === 'working' ? 'Working on: ' : 'Status: '}
                          {agent.current_task || agent.status}
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full bg-[#c17d4a]" style={{ width: `${agent.progress}%` }} />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-white/40 text-sm">No agents connected</div>
                )}
              </div>
            </div>
          </div>

          {/* FAR RIGHT - KAIROS ASSISTANT */}
          <div className="flex flex-col min-h-0 border border-white/10 bg-[#111]">
            <div className="px-4 py-3 border-b border-white/10 text-sm flex items-center gap-2 flex-shrink-0">
              <Zap className="w-4 h-4 text-[#c17d4a]" /> KAIROS ASSISTANT
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scroll p-4 space-y-4 text-sm">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={msg.type === 'task' ? 'text-right' : msg.type === 'chat' ? '' : ''}>
                  <div className={`inline-block max-w-[85%] px-4 py-2 rounded-xl text-[13.5px] ${
                    msg.type === 'task' ? 'bg-[#c17d4a] text-black' : msg.type === 'chat' ? 'bg-[#2a2a3a] text-white' : 'bg-white/5 border border-white/10'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && <div className="text-white/50 text-xs">KAIROS is thinking...</div>}
            </div>

            <form onSubmit={handleSend} className="p-4 border-t border-white/10 flex-shrink-0">
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Give task to KAIROS..."
                  className="flex-1 bg-transparent border border-white/20 px-4 py-2 text-sm font-mono focus:outline-none focus:border-[#c17d4a]"
                />
                <button type="submit" className="px-5 border border-white/20 hover:bg-white/5">
                  <Send size={16} />
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
