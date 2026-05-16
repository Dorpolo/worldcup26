from typing import Annotated
from typing_extensions import TypedDict
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    messages:        Annotated[list[BaseMessage], add_messages]
    user_id:         str
    league_id:       str
    conversation_id: str   # empty = legacy userId+leagueId scope
    ai_api_key:      str   # empty = use ANTHROPIC_API_KEY env default
    agent_config:    dict  # { skills[], mcp_configs[], memories[] } — loaded per-request
