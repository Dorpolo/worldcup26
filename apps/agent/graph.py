"""
LangGraph ReAct agent graph.
Uses a single agent node with all tools — Claude handles routing naturally.
Per-request API key override is supported via state["ai_api_key"].
"""
import os
from pathlib import Path
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode, tools_condition

from state import AgentState
from tools import ALL_TOOLS

MODEL = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")
DEFAULT_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
SYSTEM_PROMPT_PATH = Path(__file__).parent / "prompts" / "system.txt"
SYSTEM_PROMPT_TEMPLATE = SYSTEM_PROMPT_PATH.read_text()


def build_graph() -> StateGraph:
    tool_node = ToolNode(ALL_TOOLS)

    def agent_node(state: AgentState):
        # Use user-supplied key if provided, otherwise fall back to env default
        api_key = state.get("ai_api_key") or DEFAULT_API_KEY
        llm = ChatAnthropic(model=MODEL, streaming=True, api_key=api_key)
        llm_with_tools = llm.bind_tools(ALL_TOOLS)

        system = SystemMessage(
            content=SYSTEM_PROMPT_TEMPLATE.format(
                user_id=state["user_id"],
                league_id=state["league_id"],
            )
        )
        response = llm_with_tools.invoke([system] + state["messages"])
        return {"messages": [response]}

    graph = StateGraph(AgentState)
    graph.add_node("agent", agent_node)
    graph.add_node("tools", tool_node)

    graph.set_entry_point("agent")
    graph.add_conditional_edges("agent", tools_condition)
    graph.add_edge("tools", "agent")

    return graph.compile()


# Singleton — compiled once per process
compiled_graph = build_graph()
