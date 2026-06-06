"""
LangGraph ReAct agent graph with dynamic skill tools + memory injection.
Graph instances are cached by tool fingerprint to avoid recompiling for each request.
"""
import hashlib
import json
import os
from pathlib import Path

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, ToolMessage
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.checkpoint.memory import MemorySaver

from state import AgentState
from tools import ALL_TOOLS

MODEL           = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")
DEFAULT_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
SYSTEM_TEMPLATE = (Path(__file__).parent / "prompts" / "system.txt").read_text()

# Context limits — keep total prompt well under 200K tokens
MAX_TOOL_OUTPUT_CHARS = 6_000   # truncate any single tool result beyond this
MAX_CONTEXT_MESSAGES  = 16      # rolling window of messages sent to LLM

# Cache: tool-fingerprint → compiled graph
_graph_cache: dict[str, object] = {}


def _tool_fingerprint(extra_tools: list) -> str:
    names = sorted(t.name for t in extra_tools)
    return hashlib.md5(json.dumps(names).encode()).hexdigest()


def _truncate_tool_outputs(messages: list) -> list:
    """Cap oversized tool results so they don't blow up the context window."""
    result = []
    for m in messages:
        if isinstance(m, ToolMessage):
            content = str(m.content)
            if len(content) > MAX_TOOL_OUTPUT_CHARS:
                truncated = (
                    content[:MAX_TOOL_OUTPUT_CHARS]
                    + f"\n[...{len(content) - MAX_TOOL_OUTPUT_CHARS} chars truncated]"
                )
                m = ToolMessage(
                    content=truncated,
                    tool_call_id=m.tool_call_id,
                    name=getattr(m, "name", ""),
                )
        result.append(m)
    return result


def build_graph(extra_tools: list = []):
    all_tools = ALL_TOOLS + extra_tools
    raw_tool_node = ToolNode(all_tools)

    def tool_node(state: AgentState) -> dict:
        """Run tools then truncate outputs before they enter the message state."""
        result = raw_tool_node.invoke(state)
        result["messages"] = _truncate_tool_outputs(result.get("messages", []))
        return result

    def agent_node(state: AgentState):
        api_key = state.get("ai_api_key") or DEFAULT_API_KEY
        llm = ChatAnthropic(model=MODEL, streaming=True, api_key=api_key)
        llm_with_tools = llm.bind_tools(all_tools)

        # --- memories ---
        cfg      = state.get("agent_config", {})
        memories = cfg.get("memories", [])
        if memories:
            mem_lines = "\n".join(f"- [{m.get('category', 'personal')}] {m['content']}" for m in memories)
            memories_block = f"## What I know about you\n{mem_lines}"
        else:
            memories_block = "## What I know about you\nNothing stored yet."

        # --- instruction skills ---
        skills = cfg.get("skills", [])
        instruction_skills = [
            s["prompt"] for s in skills
            if s.get("type") == "instruction" and s.get("enabled", True)
        ]
        if instruction_skills:
            custom_block = "## Custom Instructions\n" + "\n".join(f"- {p}" for p in instruction_skills)
        else:
            custom_block = ""

        system_content = SYSTEM_TEMPLATE.format(
            user_id=state["user_id"],
            league_id=state["league_id"],
            memories=memories_block,
            custom_instructions=custom_block,
        )
        system = SystemMessage(content=system_content)

        # Rolling window: never send more than MAX_CONTEXT_MESSAGES to the LLM
        all_msgs = state["messages"]
        msgs = all_msgs[-MAX_CONTEXT_MESSAGES:] if len(all_msgs) > MAX_CONTEXT_MESSAGES else all_msgs

        response = llm_with_tools.invoke([system] + msgs)
        return {"messages": [response]}

    graph = StateGraph(AgentState)
    graph.add_node("agent", agent_node)
    graph.add_node("tools", tool_node)
    graph.set_entry_point("agent")
    graph.add_conditional_edges("agent", tools_condition)
    graph.add_edge("tools", "agent")

    # Initialize checkpointer for state persistence
    # Using MemorySaver for in-memory checkpointing (persists across requests in same app instance)
    checkpointer = MemorySaver()
    return graph.compile(checkpointer=checkpointer)


def get_compiled_graph(extra_tools: list = []):
    key = _tool_fingerprint(extra_tools)
    if key not in _graph_cache:
        _graph_cache[key] = build_graph(extra_tools)
    return _graph_cache[key]


# Default compiled graph (no extra tools) — used when skills haven't loaded yet
compiled_graph = get_compiled_graph([])
