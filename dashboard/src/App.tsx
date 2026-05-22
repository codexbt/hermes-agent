import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useDashboard } from './hooks/useDashboard';
import { useStore } from './hooks/useStore';
import { Scene3D } from './components/Scene3D';
import { MetricsDisplay } from './components/MetricsDisplay';
import { TerminalFeed } from './components/TerminalFeed';
import { DetailPanel } from './components/DetailPanel';
import { CommandInput } from './components/CommandInput';
import { Zap, Wifi } from 'lucide-react';

export default function App() {
  const { state, connected, triggerGoal, lastEvent } = useDashboard();
  const {
    selectedAgentDetails,
    setSelectedAgentDetails,
    showDetailPanel,
    setShowDetailPanel,
    terminalLogs,
    addLog,
  } = useStore();

  // Add logs from WebSocket events
  useEffect(() => {
    if (lastEvent) {
      let message = '';
      if (lastEvent.type === 'agent_update' && lastEvent.data) {
        message = `[${lastEvent.data.name}] ${lastEvent.data.status.toUpperCase()} - ${lastEvent.data.current_task?.slice(0, 40)}`;
      } else if (lastEvent.type === 'log_update') {
        message = `[${lastEvent.data?.agent || 'SYS'}] ${lastEvent.data?.message}`;
      } else if (lastEvent.type === 'metrics_update') {
        message = `[METRICS] Tasks: ${lastEvent.data?.tasks_completed}, Skills: ${lastEvent.data?.skills_created}`;
      }
      if (message) {
        addLog(message);
      }
    }
  }, [lastEvent, addLog]);

  const handleAgentClick = (agentName: string) => {
    const agent = state.agents.find((a) => a.name === agentName);
    if (agent) {
      setSelectedAgentDetails(agent);
      setShowDetailPanel(true);
    }
  };

  return (
    <div className="w-full h-screen bg-gradient-to-br from-blue-950 via-purple-950 to-black overflow-hidden">
      {/* 3D Canvas */}
      <Canvas
        className="w-full h-full"
        gl={{
          antialias: true,
          preserveDrawingBuffer: true,
          alpha: true,
        }}
      >
        <Scene3D agents={state.agents} activitiesLog={terminalLogs} />
      </Canvas>

      {/* Overlay UI */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Connection Status */}
        <div className="absolute top-4 left-4 flex items-center gap-2 text-sm font-mono">
          <div
            className={`w-3 h-3 rounded-full animate-pulse ${
              connected ? 'bg-green-400' : 'bg-red-400'
            }`}
          ></div>
          <span className={connected ? 'text-green-400' : 'text-red-400'}>
            {connected ? 'CONNECTED' : 'DISCONNECTED'} TO SWARM
          </span>
        </div>

        {/* HermesClaw Title */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-center">
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 tracking-wider">
            HERMESCLAW
          </h1>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest">
            Futuristic AI Swarm Command Center
          </p>
        </div>

        {/* Right Panel: Stats & Controls */}
        <div className="absolute top-4 right-4 w-96 space-y-4 pointer-events-auto">
          <MetricsDisplay
            tasksCompleted={state.tasks_completed}
            skillsCreated={state.skills_created}
            tokenUsage={state.token_usage}
            kairosStatus="ONLINE"
          />

          <CommandInput onSubmit={triggerGoal} disabled={!connected} />
        </div>

        {/* Bottom Left: Terminal Feed */}
        <div className="absolute bottom-4 left-4 w-96 pointer-events-auto">
          <TerminalFeed logs={terminalLogs} maxLines={10} />
        </div>

        {/* Bottom Right: Current Task */}
        <div className="absolute bottom-4 right-4 max-w-md pointer-events-auto">
          <div className="bg-gradient-to-br from-cyan-950 to-blue-950 rounded-lg border border-cyan-500 border-opacity-30 p-4 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={16} className="text-cyan-400" />
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                Active Task
              </span>
            </div>
            <p className="text-sm text-white line-clamp-3">
              {state.active_task || 'Awaiting commands...'}
            </p>
          </div>
        </div>

        {/* Detail Panel */}
        {showDetailPanel && (
          <DetailPanel
            agent={selectedAgentDetails}
            onClose={() => setShowDetailPanel(false)}
          />
        )}

        {/* Info Banner */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center text-xs text-gray-500 pointer-events-none">
          💡 Click on agents to focus • Scroll to zoom • Drag to rotate
        </div>
      </div>
    </div>
  );
}
        const z = Math.sin(angle) * radius
        const y = 1.5 + Math.sin(index) * 0.8

        return (
          <AgentAvatar
            key={agent.name}
            agent={agent}
            position={[x, y, z]}
            color={AGENT_COLORS[agent.name] || '#00f0ff'}
            onClick={() => onAgentClick(agent.name)}
            isSelected={selectedAgent === agent.name}
          />
        )
      })}

      {/* Dynamic particle effects based on agent activity */}
      <ParticleSystem agents={agents} />

      {/* Floating 3D Holographic Kanban / Timeline */}
      <group position={[0, 6, -12]}>
        <HoloPanel title="SWARM TIMELINE" />
      </group>

      {/* Camera controls - smooth orbit like a sci-fi command center */}
      <OrbitControls 
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={4}
        maxDistance={45}
        autoRotate={false}
        autoRotateSpeed={0.1}
      />
    </>
  )
}

export default function App() {
  const [state, setState] = useState<DashboardState>({
    agents: [],
    active_task: "Initializing 3D Command Center...",
    tasks_completed: 0,
    skills_created: 0,
    kairos_heartbeat: new Date().toISOString(),
    token_usage: 0,
    logs: ["[NEXUS] Connecting to HermesClaw core..."]
  })
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [wsConnected, setWsConnected] = useState(false)

  // === REAL-TIME WEBSOCKET CONNECTION ===
  useEffect(() => {
    const ws = new WebSocket(`ws://${window.location.hostname}:8001/ws/dashboard`)

    ws.onopen = () => {
      setWsConnected(true)
      console.log('%c[3D DASHBOARD] Connected to backend WebSocket', 'color:#00f0ff')
    }

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      if (msg.type === 'agent_update' || msg.full_state) {
        setState(prev => ({
          ...prev,
          ...msg.full_state,
          logs: [...(msg.full_state?.logs || prev.logs)].slice(-15)
        }))
      }
    }

    ws.onclose = () => setWsConnected(false)
    ws.onerror = () => setWsConnected(false)

    // Fallback polling for status if WS fails
    const pollInterval = setInterval(async () => {
      if (!wsConnected) {
        try {
          const res = await fetch('/api/status')
          if (res.ok) {
            const data = await res.json()
            setState(data)
          }
        } catch {}
      }
    }, 5000)

    return () => {
      ws.close()
      clearInterval(pollInterval)
    }
  }, [wsConnected])

  const handleAgentClick = (name: string) => {
    setSelectedAgent(name === selectedAgent ? null : name)
  }

  const selectedData = state.agents.find(a => a.name === selectedAgent)

  return (
    <div className="h-screen w-screen bg-[#0a0a0f] text-white overflow-hidden flex flex-col font-sans">
      {/* Top Neon Header - Sci-Fi Command Bar */}
      <div className="h-14 border-b border-white/10 bg-black/60 backdrop-blur-xl flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00f0ff] to-[#a855f7] flex items-center justify-center text-black font-bold text-xl">C</div>
            <div>
              <div className="font-semibold tracking-[4px] text-xl neon-text">HERMESCLAW</div>
              <div className="text-[10px] text-white/50 -mt-1">3D COMMAND CENTER • 2077</div>
            </div>
          </div>
          <div className="ml-8 text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-[#22c55e]' : 'bg-red-500'}`} />
            {wsConnected ? 'LIVE SYNC' : 'OFFLINE'}
          </div>
        </div>

        <div className="text-sm font-mono text-white/60">
          ACTIVE TASK: <span className="text-[#00f0ff] font-semibold">{state.active_task}</span>
        </div>

        <div className="flex gap-6 text-sm font-mono">
          <div>TOKENS <span className="text-[#00f0ff] font-bold">{state.token_usage.toLocaleString()}</span></div>
          <div>TASKS <span className="text-[#22c55e] font-bold">{state.tasks_completed}</span></div>
          <div>SKILLS <span className="text-[#a855f7] font-bold">{state.skills_created}</span></div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 3D VIEWPORT - The Star of the Show */}
        <div id="three-canvas" className="flex-1 relative">
          <Canvas 
            camera={{ position: [0, 12, 22], fov: 48 }} 
            style={{ background: 'transparent' }}
            gl={{ 
              alpha: true, 
              antialias: true, 
              preserveDrawingBuffer: true,
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.1
            }}
          >
            <Scene 
              agents={state.agents} 
              onAgentClick={handleAgentClick} 
              selectedAgent={selectedAgent} 
            />
          </Canvas>

          {/* Overlay 3D Labels */}
          <div className="absolute top-6 left-6 text-xs uppercase tracking-[3px] text-white/40 pointer-events-none">
            ORBIT • CLICK AGENTS • SCROLL TO ZOOM
          </div>

          {/* Fullscreen Button */}
          <button 
            onClick={() => document.getElementById('three-canvas')?.requestFullscreen()}
            className="absolute top-6 right-6 px-4 py-1.5 text-xs border border-white/30 hover:bg-white/10 rounded transition"
          >
            IMMERSIVE MODE
          </button>
        </div>

        {/* Right Cyberpunk Sidebar */}
        <div className="w-96 border-l border-white/10 bg-black/70 backdrop-blur-2xl flex flex-col z-40">
          {/* Agent Status Cards */}
          <div className="p-5 border-b border-white/10">
            <div className="text-xs uppercase tracking-[2px] text-white/50 mb-3">AGENT SWARM STATUS</div>
            <div className="space-y-2">
              {state.agents.map(agent => (
                <div 
                  key={agent.name}
                  onClick={() => handleAgentClick(agent.name)}
                  className={`agent-card p-3 rounded-xl border cursor-pointer flex items-center gap-3 ${selectedAgent === agent.name ? 'border-[#00f0ff] bg-white/5' : 'border-white/10 hover:border-white/30'}`}
                >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: AGENT_COLORS[agent.name], boxShadow: `0 0 12px ${AGENT_COLORS[agent.name]}` }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{agent.name}</div>
                    <div className="text-[10px] text-white/60 truncate">{agent.current_task}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono text-white/70">{agent.progress}%</div>
                    <div className={`text-[10px] uppercase tracking-widest ${agent.status === 'working' ? 'text-[#22c55e]' : 'text-white/50'}`}>{agent.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Agent Deep Details */}
          {selectedData && (
            <div className="p-5 border-b border-white/10 holo-panel">
              <div className="uppercase text-xs tracking-[2px] mb-2 text-[#00f0ff]">FOCUSED AGENT</div>
              <div className="text-2xl font-semibold mb-1">{selectedData.name}</div>
              <div className="text-sm text-white/70 mb-4">{selectedData.current_task}</div>
              
              <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-1">
                <div className="h-full bg-gradient-to-r from-[#00f0ff] to-[#a855f7] transition-all" style={{ width: `${selectedData.progress}%` }} />
              </div>
              <div className="text-[10px] text-right text-white/50">{selectedData.progress}% COMPLETE</div>
            </div>
          )}

          {/* Live Glowing Terminal */}
          <div className="flex-1 p-4 overflow-hidden flex flex-col">
            <div className="text-xs uppercase tracking-[2px] text-white/50 mb-2 flex justify-between">
              <span>LIVE FEED</span>
              <span className="text-[#22c55e]">KAIROS HEARTBEAT</span>
            </div>
            <div className="flex-1 bg-black/60 rounded-xl p-3 font-mono text-[11px] overflow-y-auto space-y-1 border border-white/10">
              {state.logs.slice().reverse().map((log, i) => (
                <div key={i} className="log-line opacity-90">{log}</div>
              ))}
            </div>
          </div>

          {/* Bottom Stats */}
          <div className="p-4 border-t border-white/10 grid grid-cols-3 gap-2 text-center text-xs font-mono">
            <div>
              <div className="text-[#00f0ff] text-xl font-bold">{state.tasks_completed}</div>
              <div className="text-white/50">TASKS</div>
            </div>
            <div>
              <div className="text-[#a855f7] text-xl font-bold">{state.skills_created}</div>
              <div className="text-white/50">SKILLS</div>
            </div>
            <div>
              <div className="text-[#eab308] text-xl font-bold">{Math.floor(state.token_usage / 1000)}k</div>
              <div className="text-white/50">TOKENS</div>
            </div>
          </div>
        </div>
      </div>

      {/* Beautiful Footer */}
      <div className="h-8 bg-black/80 border-t border-white/10 text-[10px] flex items-center justify-center text-white/40 tracking-[1.5px]">
        HERMESCLAW MULTI-AGENT SWARM • REAL-TIME 3D VISUALIZATION • POWERED BY REACT THREE FIBER
      </div>
    </div>
  )
}
