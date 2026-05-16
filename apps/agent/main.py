import asyncio
import json
import os
from dotenv import load_dotenv

load_dotenv()

# LangSmith tracing — set LANGCHAIN_API_KEY + LANGCHAIN_TRACING_V2=true to enable
if os.getenv("LANGCHAIN_API_KEY"):
    os.environ.setdefault("LANGCHAIN_TRACING_V2", "true")
    os.environ.setdefault("LANGCHAIN_PROJECT", os.getenv("LANGCHAIN_PROJECT", "worldcup26"))

import httpx
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from langchain_core.messages import HumanMessage, AIMessage, AIMessageChunk
from langchain_anthropic import ChatAnthropic

from auth import verify_token
from graph import get_compiled_graph
from memory import load_history, save_message
from tools.skill_tool_factory import build_skill_tools
from tools.mcp_tool_loader import load_mcp_tools

INTERNAL_URL = os.getenv("INTERNAL_API_URL", "http://localhost:3000")
INTERNAL_KEY = os.getenv("INTERNAL_API_KEY", "")
MODEL        = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")
DEFAULT_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

app = FastAPI(title="WorldCup26 AI Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("NEXTAUTH_URL", "http://localhost:3000")],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    user_id: str
    league_id: str
    message: str
    conversation_id: str = ""
    ai_api_key: str = ""


class TitleRequest(BaseModel):
    user_id: str
    league_id: str
    first_message: str
    first_response: str


async def fetch_agent_config(user_id: str) -> dict:
    """Fetch skills, mcp_configs, and memories for a user from the internal API."""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(
                f"{INTERNAL_URL}/api/internal/agent-config",
                params={"userId": user_id},
                headers={"Authorization": f"Bearer {INTERNAL_KEY}"},
            )
            if resp.status_code == 200:
                return resp.json().get("data", {})
    except Exception:
        pass
    return {"skills": [], "mcp_configs": [], "memories": []}


@app.get("/health")
def health():
    return {"ok": True, "service": "worldcup26-agent"}


@app.post("/chat")
async def chat(request: Request, body: ChatRequest, _token: str = Depends(verify_token)):
    # Load agent config (skills, MCPs, memories)
    agent_config = await fetch_agent_config(body.user_id)

    # Build dynamic extra tools from skills and MCP configs
    skill_tools = build_skill_tools(agent_config.get("skills", []))
    mcp_tools   = await load_mcp_tools(agent_config.get("mcp_configs", []))
    extra_tools = skill_tools + mcp_tools

    graph = get_compiled_graph(extra_tools)

    # Load conversation history (scoped by conversationId if provided)
    history = await load_history(body.user_id, body.league_id, body.conversation_id)

    # Persist the user message
    await save_message(body.user_id, body.league_id, "user", body.message, body.conversation_id)

    # Optional per-user API key from header or body
    user_ai_key = request.headers.get("x-user-ai-key", "") or body.ai_api_key

    initial_state = {
        "messages": history + [HumanMessage(content=body.message)],
        "user_id": body.user_id,
        "league_id": body.league_id,
        "conversation_id": body.conversation_id,
        "ai_api_key": user_ai_key,
        "agent_config": agent_config,
    }

    async def event_stream():
        full_response = ""
        try:
            async for event in graph.astream_events(initial_state, version="v2"):
                kind = event["event"]

                if kind == "on_chat_model_stream":
                    chunk: AIMessageChunk = event["data"]["chunk"]
                    token = ""
                    if isinstance(chunk.content, str):
                        token = chunk.content
                    elif isinstance(chunk.content, list):
                        for block in chunk.content:
                            if isinstance(block, dict) and block.get("type") == "text":
                                token += block.get("text", "")
                            elif isinstance(block, str):
                                token += block
                    if token:
                        full_response += token
                        yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

                elif kind == "on_tool_start":
                    tool_name = event.get("name", "tool")
                    yield f"data: {json.dumps({'type': 'tool_start', 'tool': tool_name})}\n\n"

                elif kind == "on_tool_end":
                    tool_name = event.get("name", "tool")
                    output = event.get("data", {}).get("output", "")
                    yield f"data: {json.dumps({'type': 'tool_result', 'tool': tool_name, 'result': str(output)[:500]})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
        finally:
            if full_response:
                await save_message(
                    body.user_id, body.league_id, "assistant",
                    full_response, body.conversation_id,
                )
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/chat/title")
async def generate_title(body: TitleRequest, _token: str = Depends(verify_token)):
    """Generate a short conversation title from the first exchange."""
    api_key = DEFAULT_API_KEY
    llm = ChatAnthropic(model=MODEL, api_key=api_key, max_tokens=30)
    prompt = (
        f"Generate a conversation title (max 5 words, no quotes) that captures the topic.\n"
        f"User: {body.first_message[:200]}\n"
        f"Assistant: {body.first_response[:200]}"
    )
    response = await llm.ainvoke(prompt)
    title = response.content.strip().strip('"').strip("'")
    return {"ok": True, "title": title}


@app.post("/chat/sandbox")
async def sandbox_chat(request: Request, _token: str = Depends(verify_token)):
    """
    Sandbox endpoint — agent_config is provided in the request body instead
    of fetched from the DB. Used by the AgentExperienceClient sandbox tab.
    """
    raw = await request.json()
    user_id      = raw.get("user_id", "sandbox")
    league_id    = raw.get("league_id", "")
    message      = raw.get("message", "")
    agent_config = raw.get("agent_config", {"skills": [], "mcp_configs": [], "memories": []})
    user_ai_key  = request.headers.get("x-user-ai-key", "")

    skill_tools = build_skill_tools(agent_config.get("skills", []))
    mcp_tools   = await load_mcp_tools(agent_config.get("mcp_configs", []))
    extra_tools = skill_tools + mcp_tools
    graph       = get_compiled_graph(extra_tools)

    initial_state = {
        "messages": [HumanMessage(content=message)],
        "user_id": user_id,
        "league_id": league_id,
        "conversation_id": "",
        "ai_api_key": user_ai_key,
        "agent_config": agent_config,
    }

    async def event_stream():
        try:
            async for event in graph.astream_events(initial_state, version="v2"):
                kind = event["event"]

                if kind == "on_chat_model_stream":
                    chunk: AIMessageChunk = event["data"]["chunk"]
                    token = ""
                    if isinstance(chunk.content, str):
                        token = chunk.content
                    elif isinstance(chunk.content, list):
                        for block in chunk.content:
                            if isinstance(block, dict) and block.get("type") == "text":
                                token += block.get("text", "")
                    if token:
                        yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

                elif kind == "on_tool_start":
                    tool_name = event.get("name", "tool")
                    yield f"data: {json.dumps({'type': 'tool_start', 'tool': tool_name})}\n\n"

                elif kind == "on_tool_end":
                    tool_name  = event.get("name", "tool")
                    output     = event.get("data", {}).get("output", "")
                    yield f"data: {json.dumps({'type': 'tool_result', 'tool': tool_name, 'result': str(output)[:500]})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
        finally:
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/chat/history")
async def get_history(
    user_id: str,
    league_id: str,
    conversation_id: str = "",
    limit: int = 20,
    _token: str = Depends(verify_token),
):
    history = await load_history(user_id, league_id, conversation_id)
    messages = [
        {"role": "user" if isinstance(m, HumanMessage) else "assistant", "content": m.content}
        for m in history[-limit:]
    ]
    return {"ok": True, "data": messages}
