from typing import Any, Awaitable, Callable, TypedDict

from langgraph.graph import END, START, StateGraph

from app import agents
from app.llm import LLMProvider

Emit = Callable[[str, str, str], Awaitable[None]]


class AgentState(TypedDict):
    topic: str
    audience: str
    tone: str
    plan: list[str]
    research: list[str]
    draft: str
    review: str
    needs_revision: bool
    revisions: int
    final: str


def build_graph(provider: LLMProvider, emit: Emit):
    async def planner(state: AgentState) -> dict[str, Any]:
        return await agents.planner_node(state, provider, emit)

    async def researcher(state: AgentState) -> dict[str, Any]:
        return await agents.researcher_node(state, provider, emit)

    async def writer(state: AgentState) -> dict[str, Any]:
        return await agents.writer_node(state, provider, emit)

    async def reviewer(state: AgentState) -> dict[str, Any]:
        return await agents.reviewer_node(state, provider, emit)

    async def finalize(state: AgentState) -> dict[str, Any]:
        return await agents.finalize_node(state, emit)

    graph = StateGraph(AgentState)
    graph.add_node("planner", planner)
    graph.add_node("researcher", researcher)
    graph.add_node("writer", writer)
    graph.add_node("reviewer", reviewer)
    graph.add_node("finalize", finalize)

    graph.add_edge(START, "planner")
    graph.add_edge("planner", "researcher")
    graph.add_edge("researcher", "writer")
    graph.add_edge("writer", "reviewer")
    graph.add_conditional_edges(
        "reviewer",
        agents._needs_rewrite,
        {"writer": "writer", "finalize": "finalize"},
    )
    graph.add_edge("finalize", END)
    return graph.compile()
