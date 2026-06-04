import httpx
import os
from langchain_core.tools import tool
from typing import Optional

API_BASE = os.getenv("INTERNAL_API_URL", "http://localhost:3000")
API_KEY = os.getenv("INTERNAL_API_KEY", "")

_headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}


@tool
def get_tournament_standings(league_id: str) -> dict:
    """Get current tournament standings organized by group.

    Shows each group with teams, wins/draws/losses, points, goals, and qualification status.
    Useful for understanding tournament progression and predicting outcomes based on standings.

    Args:
        league_id: The ID of the league to get standings for

    Returns:
        Dictionary with groups and team standings, including qualification zones
    """
    try:
        r = httpx.get(
            f"{API_BASE}/api/leagues/{league_id}/standings",
            headers=_headers,
            timeout=10,
        )
        return r.json()
    except Exception as e:
        return {"ok": False, "error": str(e)}


@tool
def get_market_probabilities(league_id: str, match_id: str) -> dict:
    """Get current Polly Market prediction probabilities for a specific match.

    Shows home win %, draw %, and away win % based on market consensus.
    Also includes direct link to the market on Polly Market.
    Only available for unfulfilled (scheduled/locked) matches.

    Args:
        league_id: The ID of the league
        match_id: The ID of the match

    Returns:
        Dictionary with probabilities and link to Polly Market
    """
    try:
        r = httpx.get(
            f"{API_BASE}/api/leagues/{league_id}/matches/{match_id}/market-data",
            headers=_headers,
            timeout=10,
        )
        return r.json()
    except Exception as e:
        return {"ok": False, "error": str(e)}


@tool
def get_latest_match_results(league_id: str, limit: int = 3) -> dict:
    """Get the latest finished or currently live matches with final/current scores.

    Useful for understanding recent tournament form and momentum before making predictions.
    Includes match info, scores, and completion status.

    Args:
        league_id: The ID of the league
        limit: Number of recent matches to return (default: 3, max: 10)

    Returns:
        List of recent matches with scores and status
    """
    try:
        limit = min(limit, 10)  # Cap at 10
        r = httpx.get(
            f"{API_BASE}/api/matches",
            params={"status": "finished", "limit": limit, "sort": "-kickoffAt"},
            headers=_headers,
            timeout=10,
        )
        return r.json()
    except Exception as e:
        return {"ok": False, "error": str(e)}


@tool
def get_top_scorers(league_id: str, limit: int = 10) -> dict:
    """Get current tournament top scorers ranked by goals.

    Shows players with most goals, assists, and team info.
    Helpful for predicting who will score in upcoming matches and selecting top scorers.

    Args:
        league_id: The ID of the league
        limit: Number of top scorers to return (default: 10, max: 25)

    Returns:
        List of top scorers with goal counts and team info
    """
    try:
        limit = min(limit, 25)  # Cap at 25
        r = httpx.get(
            f"{API_BASE}/api/players",
            params={"limit": limit, "sort": "-stats.goals"},
            headers=_headers,
            timeout=10,
        )
        return r.json()
    except Exception as e:
        return {"ok": False, "error": str(e)}


@tool
def search_players(query: str, team: Optional[str] = None, position: Optional[str] = None) -> dict:
    """Search for players by name, optionally filter by team or position.

    Useful for finding real players to select as top scorers in predictions.
    Supports team filtering (exact match) and position filtering (GK/DEF/MID/FWD).

    Args:
        query: Player name to search for
        team: Optional team name to filter by
        position: Optional position (GK, DEF, MID, FWD)

    Returns:
        List of matching players with full details
    """
    try:
        params = {"search": query, "limit": 20}
        if team:
            params["team"] = team
        if position and position in ["GK", "DEF", "MID", "FWD"]:
            params["position"] = position

        r = httpx.get(
            f"{API_BASE}/api/players",
            params=params,
            headers=_headers,
            timeout=10,
        )
        return r.json()
    except Exception as e:
        return {"ok": False, "error": str(e)}
