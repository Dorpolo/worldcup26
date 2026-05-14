"""
LangGraph ReAct agent graph.
Uses a single agent node with all tools — Claude handles routing naturally.
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
SYSTEM_PROMPT_PATH = Path(__file__).parent / "prompts" / "system.txt"
SYSTEM_PROMPT_TEMPLATE = SYSTEM_PROMPT_PATH.read_text()


def build_graph() -> StateGraph:
    llm = ChatAnthropic(model=MODEL, streaming=True)
    llm_with_tools = llm.bind_tools(ALL_TOOLS)

    def agent_node(state: AgentState):
        system = SystemMessage(
            content=SYSTEM_PROMPT_TEMPLATE.format(
                user_id=state["user_id"],
                league_id=state["league_id"],
            )
        )
        response = llm_with_tools.invoke([system] + state["messages"])
        return {"messages": [response]}

    tool_node = ToolNode(ALL_TOOLS)

    graph = StateGraph(AgentState)
    graph.add_node("agent", agent_node)
    graph.add_node("tools", tool_node)

    graph.set_entry_point("agent")
    graph.add_conditional_edges("agent", tools_condition)
    graph.add_edge("tools", "agent")

    return graph.compile()


# Singleton — compiled once per process
compiled_graph = build_graph()
