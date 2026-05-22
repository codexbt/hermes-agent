"""backend/dashboard_api.py
Futuristic 3D Dashboard Backend for HermesClaw.

- FastAPI + WebSocket for real-time agent status
- Broadcasts live updates from multi-agent swarm
- Serves the React 3D frontend as static files (production) or proxy in dev
- Integrates with existing core (orchestrator, kairos, etc.)
- Endpoints: /status, /ws/dashboard (real-time), /trigger_goal, etc.

Run with: uvicorn backend.dashboard_api:app --reload --port 8001
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Set

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from core.dashboard_events import get_broadcaster

# --- Logging ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("dashboard_api")

# --- Models for real-time data ---
class AgentStatus(BaseModel):
    name: str
    status: str  # idle, thinking, working, completed, error
    current_task: str
    progress: float  # 0-100
    last_update: str
    color: str  # neon color for 3D

class DashboardState(BaseModel):
    agents: List[AgentStatus]
    active_task: str
    tasks_completed: int
    skills_created: int
    kairos_heartbeat: str
    token_usage: int
    logs: List[str]  # recent log lines

# --- In-memory state (in production use Redis or proper pubsub) ---
connected_clients: Set[WebSocket] = set()
current_state: DashboardState = DashboardState(
    agents=[
        AgentStatus(name="Orchestrator", status="idle", current_task="Monitoring swarm", progress=100, last_update=datetime.now().isoformat(), color="#00f0ff"),
        AgentStatus(name="Architect", status="idle", current_task="Waiting for goal", progress=0, last_update=datetime.now().isoformat(), color="#a855f7"),
        AgentStatus(name="Coder", status="idle", current_task="No active coding", progress=0, last_update=datetime.now().isoformat(), color="#22c55e"),
        AgentStatus(name="Tester", status="idle", current_task="Ready for tests", progress=0, last_update=datetime.now().isoformat(), color="#eab308"),
        AgentStatus(name="Scribe", status="idle", current_task="Documenting knowledge", progress=0, last_update=datetime.now().isoformat(), color="#f472b6"),
    ],
    active_task="No active swarm task",
    tasks_completed=42,
    skills_created=17,
    kairos_heartbeat=datetime.now().isoformat(),
    token_usage=128450,
    logs=["[SYSTEM] Dashboard backend online", "[KAIROS] Heartbeat OK"]
)

app = FastAPI(title="HermesClaw 3D Command Center", version="1.0")

# CORS for React dev server (localhost:3000) and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Serve React build in production (when built) ---
DASHBOARD_BUILD = Path(__file__).parent.parent / "dashboard" / "dist"
if DASHBOARD_BUILD.exists():
    app.mount("/", StaticFiles(directory=str(DASHBOARD_BUILD), html=True), name="dashboard")

# --- WebSocket Manager ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        connected_clients.add(websocket)
        logger.info(f"Dashboard client connected. Total: {len(self.active_connections)}")
        # Send current state immediately
        await websocket.send_json(current_state.model_dump())

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        connected_clients.discard(websocket)
        logger.info(f"Dashboard client disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        """Broadcast to all connected 3D dashboards"""
        if not self.active_connections:
            return
        dead = []
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                dead.append(connection)
        for d in dead:
            self.disconnect(d)

manager = ConnectionManager()

# --- API Endpoints ---

@app.get("/api/status")
async def get_status():
    """Current full dashboard state (for polling fallback)"""
    return current_state

@app.post("/api/update_agent")
async def update_agent(agent_update: AgentStatus):
    """Manual or internal update for an agent (used by orchestrator later)"""
    global current_state
    for i, agent in enumerate(current_state.agents):
        if agent.name.lower() == agent_update.name.lower():
            current_state.agents[i] = agent_update
            break
    else:
        current_state.agents.append(agent_update)

    current_state.logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] {agent_update.name}: {agent_update.status} - {agent_update.current_task[:50]}")

    # Broadcast to all 3D clients
    await manager.broadcast({
        "type": "agent_update",
        "data": agent_update.model_dump(),
        "full_state": current_state.model_dump()
    })
    return {"success": True}

@app.post("/api/trigger_goal")
async def trigger_goal(goal: str):
    """Trigger a new swarm goal from dashboard (integrates with core)"""
    global current_state
    current_state.active_task = goal
    current_state.logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] DASHBOARD: New goal received → {goal[:60]}...")

    # Simulate starting the swarm (in real impl: call from bot_orchestrator or main)
    # For now broadcast that orchestrator is working
    for agent in current_state.agents:
        if agent.name == "Orchestrator":
            agent.status = "working"
            agent.current_task = f"Coordinating: {goal[:40]}"
            agent.progress = 10
            agent.last_update = datetime.now().isoformat()

    await manager.broadcast({
        "type": "new_goal",
        "goal": goal,
        "full_state": current_state.model_dump()
    })
    return {"message": "Goal queued for swarm", "goal": goal}

@app.get("/api/agents")
async def get_agents():
    return current_state.agents

# --- WebSocket Endpoint (Real-time 3D updates) ---
@app.websocket("/ws/dashboard")
async def websocket_dashboard(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep alive + optional client messages (e.g. "focus on Architect")
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
            # Future: handle client commands like "focus_agent:Architect"
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# --- Background simulation for demo (remove in production when real events come) ---
async def simulate_agent_activity():
    """Demo: randomly update agents so the 3D scene looks alive even without real swarm"""
    agent_names = ["Architect", "Coder", "Tester", "Scribe"]
    statuses = ["thinking", "working", "completed"]
    while True:
        await asyncio.sleep(4)
        if not connected_clients:
            continue  # no one watching

        import random
        agent_name = random.choice(agent_names)
        new_status = random.choice(statuses)
        task = {
            "Architect": "Designing system architecture for new feature",
            "Coder": "Writing and editing source files with Claw tools",
            "Tester": "Running pytest and verifying edge cases",
            "Scribe": "Generating documentation and auto-skills"
        }[agent_name]

        for i, a in enumerate(current_state.agents):
            if a.name == agent_name:
                a.status = new_status
                a.current_task = task
                a.progress = random.randint(20, 95) if new_status != "completed" else 100
                a.last_update = datetime.now().isoformat()
                break

        current_state.logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] {agent_name} → {new_status}")
        if len(current_state.logs) > 12:
            current_state.logs = current_state.logs[-12:]

        await manager.broadcast({
            "type": "agent_update",
            "data": current_state.agents[i].model_dump() if 'i' in locals() else {},
            "full_state": current_state.model_dump()
        })

# --- Startup ---
@app.on_event("startup")
async def startup_event():
    logger.info("🚀 HermesClaw 3D Futuristic Dashboard API starting...")
    
    # Register event broadcaster to push to WebSocket clients
    broadcaster = get_broadcaster()
    broadcaster.register_listener(manager.broadcast)
    broadcaster.enable()
    
    # Start the beautiful demo animation loop
    asyncio.create_task(simulate_agent_activity())
    logger.info("3D Dashboard WebSocket ready at /ws/dashboard")
    logger.info("Global event broadcaster registered")

# For direct run: python -m backend.dashboard_api
if __name__ == "__main__":
    uvicorn.run("backend.dashboard_api:app", host="0.0.0.0", port=8001, reload=True)
