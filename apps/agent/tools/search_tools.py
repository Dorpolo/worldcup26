import os
from langchain_core.tools import tool


@tool
def search_web(query: str) -> list[dict]:
    """
    Search the web for football news, injury updates, team form, and World Cup information.
    Returns a list of results with title, url, and content snippet.
    """
    tavily_key = os.getenv("TAVILY_API_KEY")
    if not tavily_key:
        return [{"error": "Web search not configured (TAVILY_API_KEY missing)"}]

    try:
        from tavily import TavilyClient
        client = TavilyClient(api_key=tavily_key)
        results = client.search(query, max_results=5)
        return [
            {"title": r.get("title", ""), "url": r.get("url", ""), "content": r.get("content", "")}
            for r in results.get("results", [])
        ]
    except Exception as e:
        return [{"error": str(e)}]
