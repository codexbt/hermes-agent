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
        self.llm_call = llm_call
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

        context = self.memory.get_relevant_context(goal)

        # Phase 1: Architecture
        arch = self.agents["architect"].run(goal, context)
        if not arch.success:
            return self._finalize(goal, False, "Architecture phase failed", start)

        # Phase 2: Implementation (may loop internally)
        impl = self.agents["coder"].run(goal, arch.output + "\n\n" + context)
        if not impl.success:
            return self._finalize(goal, False, "Coding phase failed", start)

        # Phase 3: Testing & verification
        test = self.agents["tester"].run(goal, impl.output)
        if not test.success:
            # For v1 we still continue but record failure
            logger.warning("Tests reported issues - continuing to scribe")

        # Phase 4: Documentation & learning capture
        scribe = self.agents["scribe"].run(goal, "\n".join([arch.output, impl.output, test.output]))

        duration = time.time() - start
        success = impl.success and arch.success

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

        final_msg = f"Swarm completed goal in {duration:.1f}s. Artifacts: {impl.artifacts + scribe.artifacts}"
        return self._finalize(goal, success, final_msg, start, extra={"scribe": scribe.output})

    def _finalize(self, goal: str, success: bool, msg: str, start: float, extra: dict | None = None) -> AgentResult:
        duration = time.time() - start
        logger.info(f"ORCHESTRATOR finished: success={success} ({duration:.1f}s)")
        return AgentResult(
            success=success,
            output=msg,
            artifacts=[],
            metadata={"duration": duration, "goal": goal, **(extra or {})},
        )


def run_swarm(goal: str, project_root: str = ".") -> AgentResult:
    """Convenience top-level function used by main.py and KAIROS."""
    orch = Orchestrator(project_root=project_root)
    return orch.run(goal)
