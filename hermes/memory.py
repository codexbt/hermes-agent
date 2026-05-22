"""hermes/memory.py
Hermes persistent memory system.
Hybrid: SQLite (structured + audit) + ChromaDB (semantic vector retrieval).
- Stores conversations, tasks, approvals
- Retrieves relevant past experience for new goals
- Triggers self-improvement signals
- Zero cloud, 100% local
"""

from __future__ import annotations

import json
import logging
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

try:
    import chromadb
except ImportError:
    chromadb = None

try:
    from pydantic import BaseModel, Field
except ImportError:
    BaseModel = dict  # type: ignore
    Field = lambda **kw: None  # type: ignore

logger = logging.getLogger("hermes.memory")


class TaskRecord(BaseModel):  # type: ignore
    id: Optional[int] = None
    ts: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    goal: str
    status: str = "completed"
    success: bool = True
    duration: float = 0.0
    agent: str = "orchestrator"
    result_summary: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)


class MemoryEntry(BaseModel):  # type: ignore
    id: str
    text: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class HermesMemory:
    """Hybrid long-term memory for the swarm."""

    def __init__(self, config: Optional[dict[str, Any]] = None, project_root: str = "."):
        self.config = config or {}
        self.root = Path(project_root).resolve()
        self.db_path = self.root / self.config.get("memory", {}).get("sqlite_path", "hermes/memory.db")
        self.chroma_path = self.root / self.config.get("memory", {}).get("chroma_path", "hermes/chroma_db")
        self.collection_name = self.config.get("memory", {}).get("collection_name", "hermes_knowledge")
        self.max_context = self.config.get("memory", {}).get("max_context_tokens", 12000)

        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.chroma_path.mkdir(parents=True, exist_ok=True)

        self._init_sqlite()
        self._init_chroma()

        logger.info(f"HermesMemory ready. sqlite={self.db_path} chroma={self.chroma_path}")

    # ---------- INIT ----------
    def _init_sqlite(self) -> None:
        self.conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        cur = self.conn.cursor()
        cur.executescript("""
            CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ts TEXT NOT NULL,
                summary TEXT,
                turns TEXT,
                tokens INTEGER DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ts TEXT NOT NULL,
                goal TEXT NOT NULL,
                status TEXT,
                success INTEGER,
                duration REAL,
                agent TEXT,
                result_summary TEXT,
                metadata TEXT
            );
            CREATE TABLE IF NOT EXISTS approvals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ts TEXT,
                action TEXT,
                approved INTEGER,
                details TEXT
            );
            CREATE TABLE IF NOT EXISTS metrics (
                key TEXT PRIMARY KEY,
                value TEXT
            );
        """)
        self.conn.commit()

    def _init_chroma(self) -> None:
        self.chroma_client = None
        self.collection = None
        if chromadb is None:
            logger.warning("chromadb not installed - running in SQLite-only mode")
            return
        try:
            self.chroma_client = chromadb.PersistentClient(path=str(self.chroma_path))
            self.collection = self.chroma_client.get_or_create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"}
            )
            logger.info(f"Chroma collection '{self.collection_name}' ready")
        except Exception as e:
            logger.exception(f"Chroma init failed: {e}")
            self.chroma_client = None
            self.collection = None

    # ---------- LOW LEVEL ----------
    def _now(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def _increment_metric(self, key: str, delta: int = 1) -> int:
        cur = self.conn.cursor()
        cur.execute("SELECT value FROM metrics WHERE key=?", (key,))
        row = cur.fetchone()
        val = int(row[0]) + delta if row else delta
        cur.execute(
            "INSERT OR REPLACE INTO metrics (key, value) VALUES (?, ?)",
            (key, str(val))
        )
        self.conn.commit()
        return val

    # ---------- PUBLIC API ----------
    def store_conversation(
        self,
        turns: list[dict[str, Any]],
        summary: Optional[str] = None,
        tokens: int = 0,
    ) -> int:
        """Store a full conversation turn list + optional LLM-generated summary."""
        if not summary:
            # naive fallback summary
            summary = " | ".join(
                t.get("content", "")[:120] for t in turns[-3:] if t.get("role") == "assistant"
            )[:400]
        ts = self._now()
        cur = self.conn.cursor()
        cur.execute(
            "INSERT INTO conversations (ts, summary, turns, tokens) VALUES (?, ?, ?, ?)",
            (ts, summary, json.dumps(turns, ensure_ascii=False), tokens),
        )
        conv_id = cur.lastrowid
        self.conn.commit()

        # Also embed summary into vector store
        self._add_to_vector(
            text=f"Conversation: {summary}",
            meta={"type": "conversation", "id": conv_id, "ts": ts},
        )
        logger.info(f"Stored conversation #{conv_id}")
        return conv_id

    def store_task(self, task: TaskRecord) -> int:
        cur = self.conn.cursor()
        cur.execute(
            """INSERT INTO tasks
               (ts, goal, status, success, duration, agent, result_summary, metadata)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                task.ts,
                task.goal,
                task.status,
                1 if task.success else 0,
                task.duration,
                task.agent,
                task.result_summary,
                json.dumps(task.metadata, ensure_ascii=False),
            ),
        )
        task_id = cur.lastrowid
        self.conn.commit()

        # Semantic memory
        embed_text = f"Task: {task.goal}\nOutcome: {task.result_summary}\nSuccess: {task.success}"
        self._add_to_vector(
            text=embed_text,
            meta={
                "type": "task",
                "task_id": task_id,
                "success": task.success,
                "agent": task.agent,
            },
        )

        total = self._increment_metric("tasks_completed" if task.success else "tasks_failed")
        logger.info(f"Stored task #{task_id} (total_success={total})")
        return task_id

    def log_approval(self, action: str, approved: bool, details: str = "") -> None:
        cur = self.conn.cursor()
        cur.execute(
            "INSERT INTO approvals (ts, action, approved, details) VALUES (?, ?, ?, ?)",
            (self._now(), action, 1 if approved else 0, details),
        )
        self.conn.commit()

    def get_task_count(self) -> int:
        cur = self.conn.cursor()
        cur.execute("SELECT value FROM metrics WHERE key='tasks_completed'")
        row = cur.fetchone()
        return int(row[0]) if row else 0

    def should_trigger_self_improve(self, every_n: int = 10) -> bool:
        return self.get_task_count() % every_n == 0 and self.get_task_count() > 0

    # ---------- RETRIEVAL ----------
    def retrieve_similar_tasks(self, query: str, k: int = 5) -> list[dict]:
        if not self.collection:
            # fallback: recent successful tasks
            return self._recent_tasks(k)
        try:
            res = self.collection.query(
                query_texts=[query],
                n_results=k,
                where={"type": "task"},
                include=["documents", "metadatas", "distances"],
            )
            out = []
            for i in range(len(res["ids"][0])):
                out.append({
                    "text": res["documents"][0][i],
                    "metadata": res["metadatas"][0][i],
                    "distance": res["distances"][0][i],
                })
            return out
        except Exception as e:
            logger.warning(f"Vector query failed, falling back: {e}")
            return self._recent_tasks(k)

    def _recent_tasks(self, limit: int) -> list[dict]:
        cur = self.conn.cursor()
        cur.execute(
            "SELECT * FROM tasks WHERE success=1 ORDER BY id DESC LIMIT ?",
            (limit,),
        )
        return [dict(row) for row in cur.fetchall()]

    def get_relevant_context(self, goal: str, max_items: int = 6) -> str:
        """Pack most useful past experience into a prompt-friendly string."""
        similar = self.retrieve_similar_tasks(goal, k=max_items)
        recent = self._recent_tasks(3)
        parts = []
        seen = set()
        for item in similar + recent:
            key = str(item.get("id") or item.get("task_id") or item.get("text", ""))[:40]
            if key in seen:
                continue
            seen.add(key)
            if "goal" in item:
                parts.append(f"PAST TASK: {item['goal']}\nRESULT: {item.get('result_summary','')}\n")
            else:
                parts.append(f"RELEVANT: {item.get('text','')[:300]}\n")
            if len(parts) >= max_items:
                break
        return "\n---\n".join(parts) if parts else "No relevant past experience yet."

    # ---------- VECTOR HELPERS ----------
    def _add_to_vector(self, text: str, meta: dict[str, Any]) -> None:
        if not self.collection:
            return
        try:
            uid = str(uuid.uuid4())
            self.collection.add(documents=[text], metadatas=[meta], ids=[uid])
        except Exception as e:
            logger.debug(f"Vector add skipped: {e}")

    # ---------- MAINTENANCE ----------
    def vacuum(self) -> None:
        self.conn.execute("VACUUM")
        self.conn.commit()
        logger.info("SQLite vacuum completed")

    def close(self) -> None:
        self.conn.close()
        logger.info("HermesMemory closed")


def get_memory(config: Optional[dict] = None, project_root: str = ".") -> HermesMemory:
    """Factory used by orchestrator and agents."""
    return HermesMemory(config=config, project_root=project_root)
