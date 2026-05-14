import asyncio
import json
import os
from dotenv import load_dotenv

load_dotenv()

# LangSmith tracing — set LANGCHAIN_API_KEY + LANGCHAIN_TRACING_V2=true to enable
if os.getenv("LANGCHAIN_API_KEY"):
    os.environ.setdefault("LANGCHAIN_TRACING_V2", "true")
    os.environ.setdefault("LANGCHAIN_PROJECT", os.getenv("LANGCHAIN_PROJECT", "worldcup26"))

from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from langchain_core.messages import HumanMessage, AIMessage, AIMessageChunk

from auth import verify_token
from graph import compiled_graph
from memory import load_history, save_message

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


@app.get("/health")
def health():
    return {"ok": True, "service": "worldcup26-agent"}


@app.post("/chat")
async def chat(request: Request, body: ChatRequest, _token: str = Depends(verify_token)):
    # Load conversation history
    history = await load_history(body.user_id, body.league_id)

    # Persist the user message
    await save_message(body.user_id, body.league_id, "user", body.message)

    # Optional per-user API key passed by the Next.js proxy
    user_ai_key = request.headers.get("x-user-ai-key", "")

    initial_state = {
        "messages": history + [HumanMessage(content=body.message)],
        "user_id": body.user_id,
        "league_id": body.league_id,
        "ai_api_key": user_ai_key,
    }

    async def event_stream():
        full_response = ""
        try:
            async for event in compiled_graph.astream_events(initial_state, version="v2"):
                kind = event["event"]

                # Stream text tokens from the agent node
                if kind == "on_chat_model_stream":
                    chunk: AIMessageChunk = event["data"]["chunk"]
                    # Anthropic returns content as a list of blocks OR a plain string
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

                # Signal tool usage so the UI can show "thinking…"
                elif kind == "on_tool_start":
                    tool_name = event.get("name", "tool")
                    yield f"data: {json.dumps({'type': 'tool_start', 'tool': tool_name})}\n\n"

                elif kind == "on_tool_end":
                    yield f"data: {json.dumps({'type': 'tool_end'})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
        finally:
            if full_response:
                await save_message(body.user_id, body.league_id, "assistant", full_response)
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
    limit: int = 20,
    _token: str = Depends(verify_token),
):
    history = await load_history(user_id, league_id)
    messages = [
        {"role": "user" if isinstance(m, HumanMessage) else "assistant", "content": m.content}
        for m in history[-limit:]
    ]
    return {"ok": True, "data": messages}
