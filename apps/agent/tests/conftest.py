"""
Shared pytest fixtures for the WorldCup26 agent test suite.
"""
import os
from unittest.mock import AsyncMock, MagicMock

import pytest
import httpx


@pytest.fixture(autouse=True)
def mock_env(monkeypatch):
    """
    Set required environment variables for every test so modules that read env
    vars at import time see sane defaults without hitting real services.
    """
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    monkeypatch.setenv("INTERNAL_API_KEY", "test-key")
    monkeypatch.setenv("MONGODB_URI", "mongodb://localhost:27017/test")
    monkeypatch.setenv("NEXT_APP_URL", "http://localhost:3000")
    monkeypatch.setenv("INTERNAL_API_URL", "http://localhost:3000")


@pytest.fixture
def mock_httpx_client():
    """
    Returns a MagicMock shaped like httpx.AsyncClient that can be used as an
    async context manager.  Call `.post.return_value` to configure responses.
    """
    client = MagicMock(spec=httpx.AsyncClient)
    client.__aenter__ = AsyncMock(return_value=client)
    client.__aexit__ = AsyncMock(return_value=False)
    client.post = AsyncMock()
    client.get = AsyncMock()
    return client
