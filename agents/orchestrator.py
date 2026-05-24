"""agents/orchestrator.py
Central swarm coordinator (Claw + Hermes style).
Decomposes high-level goals into phases and routes to specialist agents.
Maintains global state, memory writes, and final synthesis.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Optional

from core.tools import ClawTools, get_tools
from core.react_loop import make_llm_call
from core.dashboard_events import emit_agent_update, emit_log, emit_metrics
from hermes.memory import HermesMemory, get_memory, TaskRecord

logger = logging.getLogger("agents.orchestrator")


@dataclass
class AgentResult:
    success: bool
    output: str
    artifacts: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


class Orchestrator:
    """Top-level multi-agent controller."""

    name = "orchestrator"

    def __init__(
        self,
        tools: Optional[ClawTools] = None,
        memory: Optional[HermesMemory] = None,
        llm_call: Optional[Callable[[str, str], str]] = None,
        project_root: str = ".",
    ):
        self.tools = tools or get_tools(project_root)
        self.memory = memory or get_memory(project_root=project_root)
        self.llm_call = llm_call or make_llm_call()
        self.project_root = project_root
        self.agents: dict[str, Any] = {}
        self._load_specialists()
        logger.info("Orchestrator initialized with full swarm")

    def _load_specialists(self):
        # Late import to avoid circulars and allow standalone execution
        from agents.architect import Architect
        from agents.coder import Coder
        from agents.tester import Tester
        from agents.scribe import Scribe

        self.agents = {
            "architect": Architect(self.tools, self.memory, self.llm_call),
            "coder": Coder(self.tools, self.memory, self.llm_call),
            "tester": Tester(self.tools, self.memory, self.llm_call),
            "scribe": Scribe(self.tools, self.memory, self.llm_call),
        }

    def run(self, goal: str, max_steps: int = 8) -> AgentResult:
        """Main entry point for any user goal."""
        start = time.time()
        logger.info(f"ORCHESTRATOR received goal: {goal}")
        emit_agent_update("Orchestrator", "working", f"Received goal: {goal[:50]}", 20)
        emit_log(f"Swarm started for: {goal[:70]}", "info", "Orchestrator")

        context = self.memory.get_relevant_context(goal)

        # Claw Code style: auto inject @path file references into context
        file_ctx = self.tools.extract_file_context(goal) if hasattr(self.tools, 'extract_file_context') else ""
        if file_ctx:
            context = (context + "\n\n" + file_ctx).strip()

        # Phase 1: Architecture
        emit_agent_update("Architect", "working", "Analyzing requirements + codebase", 25)
        arch = self.agents["architect"].run(goal, context)
        if not arch.success:
            emit_agent_update("Architect", "error", "Architecture failed")
            return self._finalize(goal, False, "Architecture phase failed", start)

        # Phase 2: Implementation (may loop internally)
        emit_agent_update("Coder", "working", "Implementing solution using tools", 45)
        impl = self.agents["coder"].run(goal, arch.output + "\n\n" + context)
        if not impl.success:
            emit_agent_update("Coder", "error", "Coding failed")
            return self._finalize(goal, False, "Coding phase failed", start)

        # Phase 3: Testing & verification
        emit_agent_update("Tester", "working", "Validating implementation", 70)
        test = self.agents["tester"].run(goal, impl.output)
        if not test.success:
            logger.warning("Tests reported issues - continuing to scribe")
            emit_log("Tests had issues but continuing", "warning", "Tester")

        # Phase 4: Documentation & learning capture
        emit_agent_update("Scribe", "working", "Capturing knowledge + updating soul", 85)
        scribe = self.agents["scribe"].run(goal, "\n".join([arch.output, impl.output, test.output]))

        duration = time.time() - start
        success = impl.success and arch.success

        all_artifacts = list(set((impl.artifacts or []) + (scribe.artifacts or [])))

        # Persist outcome
        self.memory.store_task(
            TaskRecord(
                goal=goal,
                success=success,
                duration=duration,
                agent="orchestrator",
                result_summary=scribe.output[:500],
                metadata={"phases": ["architect", "coder", "tester", "scribe"]},
            )
        )

        emit_agent_update("Orchestrator", "completed", f"Done in {duration:.1f}s", 100)
        emit_metrics(tasks_completed=self.memory.get_task_count() if hasattr(self.memory, 'get_task_count') else None)
        emit_log(f"Swarm finished. Artifacts: {all_artifacts[:5]}", "success" if success else "warning", "Orchestrator")

        final_msg = f"Swarm completed goal in {duration:.1f}s. Artifacts: {all_artifacts}"
        return self._finalize(goal, success, final_msg, start, extra={"scribe": scribe.output}, artifacts=all_artifacts)

    def _finalize(self, goal: str, success: bool, msg: str, start: float, extra: dict | None = None, artifacts: list[str] | None = None) -> AgentResult:
        duration = time.time() - start
        logger.info(f"ORCHESTRATOR finished: success={success} ({duration:.1f}s)")
        return AgentResult(
            success=success,
            output=msg,
            artifacts=artifacts or [],
            metadata={"duration": duration, "goal": goal, **(extra or {})},
        )


def run_swarm(goal: str, project_root: str = ".") -> AgentResult:
    """Convenience top-level function used by main.py and KAIROS."""
    orch = Orchestrator(project_root=project_root)  # llm_call is auto-injected inside
    return orch.run(goal)
