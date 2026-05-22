"""agents/architect.py
Architect agent: analyzes goals, produces technical design, identifies files and interfaces.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Callable, Optional

from core.tools import ClawTools
from hermes.memory import HermesMemory

logger = logging.getLogger("agents.architect")


@dataclass
class AgentResult:
    success: bool
    output: str
    artifacts: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


class Architect:
    name = "architect"
    SYSTEM_PROMPT = """You are a senior software architect in a local autonomous swarm.
Think step-by-step. Output:
1. High-level design decisions
2. Files that must be created or modified (with reasons)
3. Key interfaces / data models
4. Risks and verification steps
Keep it concise and actionable."""

    def __init__(
        self,
        tools: ClawTools,
        memory: HermesMemory,
        llm_call: Optional[Callable[[str, str], str]] = None,
    ):
        self.tools = tools
        self.memory = memory
        self.llm_call = llm_call

    def run(self, goal: str, context: str = "") -> AgentResult:
        logger.info(f"ARCHITECT analyzing: {goal[:80]}...")
        # Use tools to explore current codebase
        structure = self.tools.list_dir(".", recursive=True)
        relevant = self.memory.get_relevant_context(goal)

        user_prompt = f"""GOAL: {goal}

CURRENT CODEBASE STRUCTURE (truncated):
{structure.get('output', '')[:1500]}

RELEVANT PAST KNOWLEDGE:
{relevant[:1200]}

CONTEXT FROM PREVIOUS PHASE:
{context[:800]}

Produce the architecture plan now."""

        if self.llm_call:
            plan = self.llm_call(self.SYSTEM_PROMPT, user_prompt)
        else:
            # Rule-based intelligent fallback (very capable)
            plan = self._fallback_plan(goal, structure, relevant)

        # Record design as artifact
        design_path = "hermes/skills/architecture_latest.md"
        self.tools.write_file(design_path, f"# Architecture for: {goal}\n\n{plan}")
        logger.info("ARCHITECT produced design")

        return AgentResult(
            success=True,
            output=plan,
            artifacts=[design_path],
            metadata={"phase": "architecture"},
        )

    def _fallback_plan(self, goal: str, structure: dict, relevant: str) -> str:
        files = (structure.get("output") or "").splitlines()[:30]
        return f"""ARCHITECTURE PLAN (local rule-based)

Goal: {goal}

1. Design approach: Extend existing Claw-Hermes modular structure.
   - Prefer adding to existing agents/ and core/ when possible.
   - Use typed dataclasses and return AgentResult everywhere.

2. Files to create/modify:
   - agents/ (new specialists if needed)
   - core/ (new tools if required)
   - hermes/skills/ (auto-generated YAML after success)

3. Key interfaces:
   - All agents implement .run(goal, context) -> AgentResult
   - Tools always return structured dicts with success/error

4. Risks & verification:
   - Path escape protection already in tools
   - Approval gates for destructive ops
   - After implementation run full test via tester agent

Relevant past: {relevant[:300]}

Next: hand off to Coder agent.
"""
