import httpx
import os
from langchain_core.tools import tool


API_BASE = os.getenv("INTERNAL_API_URL", "http://localhost:3000")
API_KEY = os.getenv("INTERNAL_API_KEY", "")

_headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}


@tool
def get_league_table(league_id: str) -> dict:
    """Get the current league standings with rank, name, and total points for every member."""
    try:
        r = httpx.get(f"{API_BASE}/api/leagues/{league_id}/leaderboard", headers=_headers, timeout=10)
        return r.json()
    except Exception as e:
        return {"ok": False, "error": str(e)}


@tool
def get_league_members(league_id: str) -> dict:
    """Get all members in a league with their roles and points."""
    try:
        r = httpx.get(f"{API_BASE}/api/leagues/{league_id}/members", headers=_headers, timeout=10)
        return r.json()
    except Exception as e:
        return {"ok": False, "error": str(e)}


@tool
def get_league_stats(league_id: str) -> dict:
    """Get aggregate stats for the league: prediction accuracy, hardest matches, per-user breakdown."""
    try:
        r = httpx.get(f"{API_BASE}/api/leagues/{league_id}/stats", headers=_headers, timeout=10)
        return r.json()
    except Exception as e:
        return {"ok": False, "error": str(e)}


@tool
def get_league_trends(league_id: str) -> dict:
    """Get points progression and rank history over time for all league members."""
    try:
        r = httpx.get(f"{API_BASE}/api/leagues/{league_id}/trends", headers=_headers, timeout=10)
        return r.json()
    except Exception as e:
        return {"ok": False, "error": str(e)}


@tool
def get_league_context(league_id: str) -> dict:
    """Get the full scoring rules, cup competition format, and tournament progress for a league.
    Use this when a user asks how scoring works, what the rules are, how the cup works,
    or anything about the league format."""
    try:
        r = httpx.get(f"{API_BASE}/api/leagues/{league_id}/context", headers=_headers, timeout=10)
        return r.json()
    except Exception as e:
        return {"ok": False, "error": str(e)}
