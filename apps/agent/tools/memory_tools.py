"""
Tool for the agent to save long-term memories about a user.
Calls the internal API so memories persist across sessions.
"""
import os
import httpx
from langchain_core.tools import tool

INTERNAL_URL = os.getenv("INTERNAL_API_URL", "http://localhost:3000")
INTERNAL_KEY = os.getenv("INTERNAL_API_KEY", "")

VALID_CATEGORIES = {"preferences", "league-notes", "player-observations", "strategy", "personal"}


@tool
def save_memory(user_id: str, content: str, category: str = "personal", league_id: str = "") -> dict:
    """
    Save an important fact about the user to long-term memory.
    Call this silently when you learn something worth remembering.
    Categories: preferences, league-notes, player-observations, strategy, personal.
    """
    if category not in VALID_CATEGORIES:
        category = "personal"

    payload: dict = {"userId": user_id, "content": content[:500], "category": category, "source": "auto"}
    if league_id:
        payload["leagueId"] = league_id

    try:
        with httpx.Client(timeout=5) as client:
            resp = client.post(
                f"{INTERNAL_URL}/api/internal/memories",
                json=payload,
                headers={"Authorization": f"Bearer {INTERNAL_KEY}"},
            )
            if resp.status_code in (200, 201):
                return {"ok": True}
    except Exception:
        pass
    return {"ok": False}
