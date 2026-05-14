from .league_tools import get_league_table, get_league_members, get_league_stats, get_league_trends, get_league_context
from .match_tools import get_upcoming_matches, get_match_stats, get_all_matches
from .prediction_tools import get_user_predictions, submit_prediction
from .search_tools import search_web

ALL_TOOLS = [
    get_league_table,
    get_league_members,
    get_league_stats,
    get_league_trends,
    get_league_context,
    get_upcoming_matches,
    get_match_stats,
    get_all_matches,
    get_user_predictions,
    submit_prediction,
    search_web,
]
