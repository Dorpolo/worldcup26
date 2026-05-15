"""
Tests for the /health endpoint in apps/agent/main.py.

Uses FastAPI's TestClient so no real HTTP server is needed.
Heavy imports (LangChain, Motor) are mocked so tests run without real credentials.
"""
import sys
import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


# ---------------------------------------------------------------------------
# Helpers to mock heavy dependencies before importing main
# ---------------------------------------------------------------------------

def _build_module_mocks():
    """Return a dict of module-name → MagicMock for all heavy imports."""
    mocks = {}

    # LangChain / LangGraph
    for mod in [
        "langchain_core",
        "langchain_core.messages",
        "langchain_core.tools",
        "langchain_anthropic",
        "langgraph",
        "langgraph.graph",
    ]:
        mocks[mod] = MagicMock()

    # Motor (async MongoDB)
    mocks["motor"] = MagicMock()
    mocks["motor.motor_asyncio"] = MagicMock()

    # Local modules that touch DB / AI at import time
    mocks["auth"] = MagicMock()
    mocks["auth"].verify_token = MagicMock(return_value="ok")
    mocks["graph"] = MagicMock()
    mocks["graph"].get_compiled_graph = MagicMock(return_value=MagicMock())
    mocks["memory"] = MagicMock()
    mocks["memory"].load_history = AsyncMock(return_value=[])
    mocks["memory"].save_message = AsyncMock()
    mocks["tools"] = MagicMock()
    mocks["tools.skill_tool_factory"] = MagicMock()
    mocks["tools.skill_tool_factory"].build_skill_tools = MagicMock(return_value=[])
    mocks["tools.mcp_tool_loader"] = MagicMock()
    mocks["tools.mcp_tool_loader"].load_mcp_tools = AsyncMock(return_value=[])

    return mocks


# ---------------------------------------------------------------------------
# Fixture: TestClient with all heavy deps mocked
# ---------------------------------------------------------------------------

@pytest.fixture
def client():
    """Provide a FastAPI TestClient with external dependencies mocked."""
    # Ensure the agent package root is on the path
    agent_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    if agent_dir not in sys.path:
        sys.path.insert(0, agent_dir)

    # Remove stale cached module if re-running
    for mod_name in list(sys.modules.keys()):
        if mod_name in ("main",) or mod_name.startswith("tools."):
            del sys.modules[mod_name]

    module_mocks = _build_module_mocks()

    with patch.dict(sys.modules, module_mocks):
        from fastapi.testclient import TestClient
        import main as agent_main  # type: ignore
        yield TestClient(agent_main.app)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestHealthEndpoint:
    def test_returns_200(self, client):
        response = client.get("/health")
        assert response.status_code == 200

    def test_response_has_ok_field(self, client):
        data = client.get("/health").json()
        assert "ok" in data

    def test_ok_is_truthy(self, client):
        data = client.get("/health").json()
        assert data["ok"] is True

    def test_response_is_json(self, client):
        response = client.get("/health")
        assert response.headers["content-type"].startswith("application/json")

    def test_service_field_present(self, client):
        data = client.get("/health").json()
        assert "service" in data

    def test_service_field_value(self, client):
        data = client.get("/health").json()
        assert "worldcup26" in data["service"].lower() or "agent" in data["service"].lower()
