import asyncio

import pytest

from app.graph import build_graph
from app.llm import OfflineProvider

STATE = {
    "topic": "AI agents in 2026",
    "audience": "engineers",
    "tone": "professional",
    "plan": [],
    "research": [],
    "draft": "",
    "review": "",
    "needs_revision": False,
    "revisions": 0,
    "final": "",
}


@pytest.mark.asyncio
async def test_pipeline_produces_full_article():
    events = []

    async def emit(kind, node, content):
        events.append((kind, node))

    provider = OfflineProvider(token_delay_ms=0)
    app = build_graph(provider, emit)
    result = await app.ainvoke(dict(STATE))

    assert len(result["plan"]) >= 4
    assert len(result["research"]) >= 3
    assert len(result["draft"]) > 200
    assert result["review"]
    assert result["final"] == result["draft"]
    assert len(events) > 50


@pytest.mark.asyncio
async def test_offline_provider_streams_chunks():
    provider = OfflineProvider(token_delay_ms=0)
    chunks = [chunk async for chunk in provider.stream("planner", "topic: x")]
    assert chunks
    assert "".join(chunks)


def test_rewrite_routing():
    from app import agents

    assert agents._needs_rewrite({"needs_revision": True, "revisions": 0}) == "writer"
    assert agents._needs_rewrite({"needs_revision": True, "revisions": 5}) == "finalize"
    assert agents._needs_rewrite({"needs_revision": False}) == "finalize"
