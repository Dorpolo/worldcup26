"""
Conversation memory backed by MongoDB via motor (async).
Stores the last MAX_HISTORY messages per conversation (or user+league fallback).
Also manages long-term user memories injected into the system prompt.
"""
import os
import httpx
from motor.motor_asyncio import AsyncIOMotorClient
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage

MONGO_URI    = os.getenv("MONGODB_URI", "mongodb://localhost:27017/worldcup26")
INTERNAL_URL = os.getenv("INTERNAL_API_URL", "http://localhost:3000")
INTERNAL_KEY = os.getenv("INTERNAL_API_KEY", "")
MAX_HISTORY       = 10    # human+AI pairs kept in DB per conversation
MAX_SAVED_CONTENT = 8_000  # cap stored message length to avoid loading huge responses

_client: AsyncIOMotorClient | None = None


def _get_collection():
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(MONGO_URI)
    db = _client.get_default_database()
    return db["chatmessages"]


async def load_history(
    user_id: str,
    league_id: str,
    conversation_id: str = "",
) -> list[BaseMessage]:
    """Load history strictly scoped to a conversation_id.
    Returns empty list if no conversation_id — never mix across conversations."""
    if not conversation_id:
        return []

    col = _get_collection()
    docs = await col.find(
        {"conversationId": conversation_id},
        sort=[("createdAt", 1)],
    ).to_list(MAX_HISTORY)

    messages: list[BaseMessage] = []
    for doc in docs:
        if doc["role"] == "user":
            messages.append(HumanMessage(content=doc["content"]))
        else:
            messages.append(AIMessage(content=doc["content"]))
    return messages


async def save_message(
    user_id: str,
    league_id: str,
    role: str,
    content: str,
    conversation_id: str = "",
) -> None:
    """Save a message. Requires conversation_id — orphaned messages without one are dropped."""
    if not conversation_id:
        return  # never save without a conversation_id; prevents orphaned cross-context bleed

    from datetime import datetime, timezone

    col = _get_collection()
    doc: dict = {
        "userId":         user_id,
        "leagueId":       league_id,
        "conversationId": conversation_id,
        "role":           role,
        "content":        content[:MAX_SAVED_CONTENT],
        "createdAt":      datetime.now(timezone.utc),
    }
    await col.insert_one(doc)

    # Prune to MAX_HISTORY — only prune within this conversation
    if not conversation_id:
        return
    query = {"conversationId": conversation_id}
    count = await col.count_documents(query)
    if count > MAX_HISTORY:
        oldest = await col.find(query, sort=[("createdAt", 1)]).to_list(count - MAX_HISTORY)
        ids = [d["_id"] for d in oldest]
        await col.delete_many({"_id": {"$in": ids}})


async def load_user_memories(user_id: str, league_id: str) -> list[dict]:
    """Fetch the user's top memories from the internal API for system prompt injection."""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(
                f"{INTERNAL_URL}/api/internal/memories",
                params={"userId": user_id, "leagueId": league_id, "limit": 10},
                headers={"Authorization": f"Bearer {INTERNAL_KEY}"},
            )
            if resp.status_code == 200:
                return resp.json().get("data", [])
    except Exception:
        pass
    return []
