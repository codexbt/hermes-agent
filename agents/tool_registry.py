import json
from pathlib import Path

class ToolRegistry:

    def __init__(self):
        self.path = Path("hermes/skills/tool_registry.json")

    def register_tool(self, name, description):
        data = []

        if self.path.exists():
            data = json.loads(self.path.read_text())

        data.append({
            "name": name,
            "description": description
        })

        self.path.write_text(
            json.dumps(data, indent=2)
        )

    def list_tools(self):
        if not self.path.exists():
            return []

        return json.loads(
            self.path.read_text()
        )
