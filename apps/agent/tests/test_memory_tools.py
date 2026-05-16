"""
Tests for apps/agent/tools/memory_tools.py — save_memory tool.

The tool makes a synchronous httpx.Client.post call, so we patch
httpx.Client to intercept the network call without hitting a real server.
"""
import sys
import os
from unittest.mock import MagicMock, patch

import pytest


# ---------------------------------------------------------------------------
# Helper — build a fake httpx response
# ---------------------------------------------------------------------------

def _fake_response(status_code: int, json_data: dict | None = None) -> MagicMock:
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = json_data or {}
    return resp


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestSaveMemory:
    """Tests for the save_memory LangChain tool."""

    def _invoke(self, mock_post, **kwargs):
        """Import and invoke save_memory inside a patched httpx.Client context."""
        # Re-import inside the test so the module picks up monkeypatched env vars
        if "tools.memory_tools" in sys.modules:
            del sys.modules["tools.memory_tools"]

        # Patch httpx.Client used by the module
        mock_client_instance = MagicMock()
        mock_client_instance.__enter__ = MagicMock(return_value=mock_client_instance)
        mock_client_instance.__exit__ = MagicMock(return_value=False)
        mock_client_instance.post = mock_post

        with patch("httpx.Client", return_value=mock_client_instance):
            # Add agent dir to path if not already there
            agent_dir = os.path.join(os.path.dirname(__file__), "..")
            if agent_dir not in sys.path:
                sys.path.insert(0, agent_dir)

            from tools.memory_tools import save_memory  # type: ignore

            defaults = dict(user_id="user123", content="Likes attacking football", category="preferences", league_id="")
            defaults.update(kwargs)
            return save_memory.invoke(defaults), mock_client_instance

    def test_success_response(self):
        mock_post = MagicMock(return_value=_fake_response(201))
        result, _ = self._invoke(mock_post)
        assert result == {"ok": True}

    def test_post_is_called_once(self):
        mock_post = MagicMock(return_value=_fake_response(200))
        _, client = self._invoke(mock_post)
        client.post.assert_called_once()

    def test_correct_endpoint(self):
        mock_post = MagicMock(return_value=_fake_response(200))
        _, client = self._invoke(mock_post)
        call_args = client.post.call_args
        url = call_args[0][0] if call_args[0] else call_args.kwargs.get("url", "")
        assert "/api/internal/memories" in url

    def test_payload_structure_with_league_id(self):
        mock_post = MagicMock(return_value=_fake_response(200))
        _, client = self._invoke(mock_post, user_id="u1", content="Strong defence", category="strategy", league_id="league99")
        call_kwargs = client.post.call_args.kwargs
        payload = call_kwargs.get("json", {})
        assert payload["userId"] == "u1"
        assert payload["content"] == "Strong defence"
        assert payload["category"] == "strategy"
        assert payload["leagueId"] == "league99"
        assert payload["source"] == "auto"

    def test_payload_no_league_id_when_empty(self):
        mock_post = MagicMock(return_value=_fake_response(200))
        _, client = self._invoke(mock_post, league_id="")
        call_kwargs = client.post.call_args.kwargs
        payload = call_kwargs.get("json", {})
        assert "leagueId" not in payload

    def test_invalid_category_falls_back_to_personal(self):
        mock_post = MagicMock(return_value=_fake_response(200))
        _, client = self._invoke(mock_post, category="totally-invalid")
        payload = client.post.call_args.kwargs.get("json", {})
        assert payload["category"] == "personal"

    def test_content_truncated_to_500_chars(self):
        long_content = "x" * 1000
        mock_post = MagicMock(return_value=_fake_response(200))
        _, client = self._invoke(mock_post, content=long_content)
        payload = client.post.call_args.kwargs.get("json", {})
        assert len(payload["content"]) == 500

    def test_auth_header_present(self):
        mock_post = MagicMock(return_value=_fake_response(200))
        _, client = self._invoke(mock_post)
        call_kwargs = client.post.call_args.kwargs
        headers = call_kwargs.get("headers", {})
        assert "Authorization" in headers
        assert headers["Authorization"].startswith("Bearer ")

    def test_error_response_returns_ok_false(self):
        mock_post = MagicMock(return_value=_fake_response(500))
        result, _ = self._invoke(mock_post)
        assert result == {"ok": False}

    def test_404_response_returns_ok_false(self):
        mock_post = MagicMock(return_value=_fake_response(404))
        result, _ = self._invoke(mock_post)
        assert result == {"ok": False}

    def test_network_exception_returns_ok_false(self):
        mock_post = MagicMock(side_effect=Exception("Connection refused"))
        result, _ = self._invoke(mock_post)
        assert result == {"ok": False}

    def test_valid_categories_accepted(self):
        valid = ["preferences", "league-notes", "player-observations", "strategy", "personal"]
        for cat in valid:
            mock_post = MagicMock(return_value=_fake_response(200))
            _, client = self._invoke(mock_post, category=cat)
            payload = client.post.call_args.kwargs.get("json", {})
            assert payload["category"] == cat
