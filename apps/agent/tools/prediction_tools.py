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
