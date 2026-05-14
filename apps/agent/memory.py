"""
Conversation memory backed by MongoDB via motor (async).
Stores the last MAX_HISTORY messages per user+league pair.
"""
import os
from motor.motor_asyncio import AsyncIOMotorClient
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage

MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/worldcup26")
MAX_HISTORY = 20

_client: AsyncIOMotorClient | None = None


def _get_collection():
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(MONGO_URI)
    db = _client.get_default_database()
    return db["chatmessages"]


async def load_history(user_id: str, league_id: str) -> list[BaseMessage]:
    col = _get_collection()
    docs = await col.find(
        {"userId": user_id, "leagueId": league_id},
        sort=[("createdAt", 1)],
    ).to_list(MAX_HISTORY)

    messages: list[BaseMessage] = []
    for doc in docs:
        if doc["role"] == "user":
            messages.append(HumanMessage(content=doc["content"]))
        else:
            messages.append(AIMessage(content=doc["content"]))
    return messages


async def save_message(user_id: str, league_id: str, role: str, content: str) -> None:
    from datetime import datetime, timezone

    col = _get_collection()
    await col.insert_one({
        "userId": user_id,
        "leagueId": league_id,
        "role": role,
        "content": content,
        "createdAt": datetime.now(timezone.utc),
    })

    # Prune to MAX_HISTORY — keep latest
    count = await col.count_documents({"userId": user_id, "leagueId": league_id})
    if count > MAX_HISTORY:
        oldest = await col.find(
            {"userId": user_id, "leagueId": league_id},
            sort=[("createdAt", 1)],
        ).to_list(count - MAX_HISTORY)
        ids = [d["_id"] for d in oldest]
        await col.delete_many({"_id": {"$in": ids}})
