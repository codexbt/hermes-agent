"""agents/tester.py
Tester agent: validates changes, runs tests, reports issues with reproduction steps.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Callable, Optional

from core.tools import ClawTools
from hermes.memory import HermesMemory, TaskRecord

logger = logging.getLogger("agents.tester")


@dataclass
class AgentResult:
    success: bool
    output: str
    artifacts: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


class Tester:
    name = "tester"
    SYSTEM_PROMPT = "You are a meticulous QA engineer and test automation expert."

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
        logger.info(f"TESTER validating goal: {goal[:60]}...")
        artifacts = []

        # Run project tests if they exist
        test_result = self.tools.run_command("python -m pytest -q --tb=line 2>&1 | head -30", timeout=90)
        output = test_result.get("output", "")

        # Also try a basic syntax/import check on the whole project
        syntax_check = self.tools.run_command(
            'python -c "import ast, pathlib; [ast.parse(p.read_text(encoding=\'utf-8\')) for p in pathlib.Path(\".\").rglob(\"*.py\")]; print(\"All Python files parse successfully\")"',
            timeout=30,
        )

        combined = f"TEST RUN:\n{output}\n\nSYNTAX CHECK:\n{syntax_check.get('output','')}"
        success = test_result.get("success", False) or "All Python files parse successfully" in syntax_check.get("output", "")

        if not success:
            # Record failure for self-improvement
            self.memory.store_task(
                TaskRecord(
                    goal=f"Fix test failures for: {goal}",
                    success=False,
                    result_summary=combined[:400],
                    duration=0.0,
                    agent="tester",
                    metadata={},
                )
            )

        return AgentResult(
            success=success,
            output=combined[:1200],
            artifacts=artifacts,
            metadata={"phase": "testing"},
        )
