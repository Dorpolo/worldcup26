import httpx
import os
from langchain_core.tools import tool


API_BASE = os.getenv("INTERNAL_API_URL", "http://localhost:3000")
API_KEY = os.getenv("INTERNAL_API_KEY", "")

_headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}


@tool
def get_user_predictions(user_id: str, league_id: str, status: str = "all") -> dict:
    """
    Get a user's predictions for a league.
    status: 'pending' | 'locked' | 'finished' | 'all'
    """
    try:
        r = httpx.get(
            f"{API_BASE}/api/predictions",
            params={"userId": user_id, "leagueId": league_id, "status": status},
            headers=_headers,
            timeout=10,
        )
        return r.json()
    except Exception as e:
        return {"ok": False, "error": str(e)}


@tool
def get_user_stats(user_id: str, league_id: str) -> dict:
    """
    Get a specific user's leaderboard position, total points, rank, and prediction summary in a league.
    Use this when a mentioned @user asks about their standing, or when comparing users.
    """
    try:
        r = httpx.get(
            f"{API_BASE}/api/leagues/{league_id}/leaderboard",
            headers=_headers,
            timeout=10,
        )
        data = r.json()
        if not data.get("ok"):
            return data
        members = data.get("data", [])
        user = next((m for m in members if m.get("userId") == user_id), None)
        if not user:
            return {"ok": False, "error": f"User {user_id} not found in this league"}
        return {"ok": True, "data": user}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@tool
def get_match_distribution(match_id: str, league_id: str, league_slug: str) -> dict:
    """
    Get prediction distribution for a specific match: who predicted what, distribution percentages,
    and how many points each member scored. Use when a @match is mentioned or user asks about a match.
    league_slug is the URL-friendly league identifier (e.g. 'amigos-fc').
    match_id is the MongoDB ObjectId of the match.
    """
    try:
        r = httpx.get(
            f"{API_BASE}/api/leagues/{league_slug}/matches/{match_id}/predictions",
            headers=_headers,
            timeout=10,
        )
        return r.json()
    except Exception as e:
        return {"ok": False, "error": str(e)}


@tool
def submit_prediction(
    user_id: str,
    league_id: str,
    match_id: str,
    home_score: int,
    away_score: int,
) -> dict:
    """
    Submit or update a match prediction on behalf of the user.
    Returns an error if the match is locked (< 15 min to kickoff).
    Always confirm with the user before calling this tool.
    """
    try:
        r = httpx.post(
            f"{API_BASE}/api/predictions",
            json={
                "userId": user_id,
                "leagueId": league_id,
                "matchId": match_id,
                "homeScore": home_score,
                "awayScore": away_score,
            },
            headers=_headers,
            timeout=10,
        )
        return r.json()
    except Exception as e:
        return {"ok": False, "error": str(e)}
