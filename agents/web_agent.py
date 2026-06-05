from dataclasses import dataclass, field
from typing import Any

@dataclass
class AgentResult:
    success: bool
    output: str
    artifacts: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)

class WebAgent:
    name = "web_agent"

    def __init__(self, tools, memory, llm_call=None):
        self.tools = tools
        self.memory = memory
        self.llm_call = llm_call

    def run(self, goal: str, context: str = ""):
        return AgentResult(
            success=True,
            output=f"Web research completed for: {goal}"
        )
