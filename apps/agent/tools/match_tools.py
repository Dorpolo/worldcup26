import httpx
import os
from langchain_core.tools import tool


API_BASE = os.getenv("INTERNAL_API_URL", "http://localhost:3000")
API_KEY = os.getenv("INTERNAL_API_KEY", "")

_headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}


@tool
def get_upcoming_matches(hours_ahead: int = 48) -> dict:
    """Get upcoming World Cup matches with kickoff times and lock deadlines. Default: next 48 hours."""
    try:
        r = httpx.get(
            f"{API_BASE}/api/matches/upcoming",
            params={"hours": hours_ahead},
            headers=_headers,
            timeout=10,
        )
        return r.json()
    except Exception as e:
        return {"ok": False, "error": str(e)}


@tool
def get_match_stats(match_id: str, league_id: str) -> dict:
    """Get prediction distribution and scoring breakdown for a specific finished match in a league."""
    try:
        r = httpx.get(
            f"{API_BASE}/api/leagues/{league_id}/stats/match/{match_id}",
            headers=_headers,
            timeout=10,
        )
        return r.json()
    except Exception as e:
        return {"ok": False, "error": str(e)}


@tool
def get_all_matches(stage: str = "") -> dict:
    """Get all World Cup 2026 matches, optionally filtered by stage (group/round_of_16/quarter_final/semi_final/final)."""
    try:
        params = {}
        if stage:
            params["stage"] = stage
        r = httpx.get(f"{API_BASE}/api/matches", params=params, headers=_headers, timeout=10)
        return r.json()
    except Exception as e:
        return {"ok": False, "error": str(e)}
