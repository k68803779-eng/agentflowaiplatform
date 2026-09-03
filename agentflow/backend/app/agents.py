from typing import Any, Awaitable, Callable

from app.llm import LLMProvider

Emit = Callable[[str, str, str], Awaitable[None]]


async def planner_node(state: dict, provider: LLMProvider, emit: Emit) -> dict:
    await emit("node_start", "planner", "Planning the article structure")
    system = (
        "You are the planner agent. Break a writing brief into 4-6 "
        "well-named sections that form a compelling narrative arc."
    )
    prompt = (
        f"Topic: {state['topic']}\nAudience: {state['audience']}\n"
        f"Tone: {state['tone']}\n\nProduce the section outline, one per line."
    )
    text = await _stream_text(provider, system, prompt, "planner", emit)
    plan = [line.strip() for line in text.splitlines() if line.strip()]
    if not plan:
        plan = [f"1. About {state['topic']}"]
    await emit("node_end", "planner", f"Planned {len(plan)} sections")
    return {"plan": plan}


async def researcher_node(state: dict, provider: LLMProvider, emit: Emit) -> dict:
    await emit("node_start", "researcher", "Gathering research notes")
    system = (
        "You are the researcher agent. Produce concise, factual research bullets "
        "that would support writing a well-grounded article."
    )
    outline = "\n".join(state["plan"])
    prompt = (
        f"Topic: {state['topic']}\nAudience: {state['audience']}\n\n"
        f"Section outline:\n{outline}\n\nProduce 4-6 research bullets."
    )
    text = await _stream_text(provider, system, prompt, "researcher", emit)
    research = [b.strip() for b in text.splitlines() if b.strip()]
    if not research:
        research = [f"Research note about {state['topic']}"]
    await emit("node_end", "researcher", f"Collected {len(research)} research notes")
    return {"research": research}


async def writer_node(state: dict, provider: LLMProvider, emit: Emit) -> dict:
    rewriting = bool(state.get("draft"))
    if rewriting:
        await emit("node_start", "writer", "Revising the draft from reviewer feedback")
    else:
        await emit("node_start", "writer", "Drafting the article")
    system = (
        "You are the writer agent. Write a polished, well-structured article "
        "using the plan and research. Match the requested tone and audience."
    )
    research = "\n".join(f"- {r}" for r in state.get("research", []))
    prompt = (
        f"Topic: {state['topic']}\nAudience: {state['audience']}\nTone: {state['tone']}\n\n"
        f"Sections:\n{state['plan']}\n\nResearch:\n{research}\n"
    )
    if rewriting:
        prompt += f"\nReviewer feedback to incorporate:\n{state.get('review', '')}\n"
    text = await _stream_text(provider, system, prompt, "writer", emit)
    revisions = state.get("revisions", 0) + (1 if rewriting else 0)
    await emit("node_end", "writer", "Draft complete")
    return {"draft": text, "revisions": revisions}


async def reviewer_node(state: dict, provider: LLMProvider, emit: Emit) -> dict:
    await emit("node_start", "reviewer", "Critiquing the draft")
    system = (
        "You are the reviewer agent. Assess the draft for structure, clarity, "
        "accuracy, and tone. End with a single line: NEEDS_REVISIONS: yes/no"
    )
    prompt = (
        f"Topic: {state['topic']}\nAudience: {state['audience']}\n\nDraft:\n{state['draft']}\n"
    )
    text = await _stream_text(provider, system, prompt, "reviewer", emit)
    needs = "yes" in text.lower().split("NEEDS_REVISIONS:")[-1].strip().lower()[:3]
    await emit("node_end", "reviewer", "Review complete")
    return {"review": text, "needs_revision": needs}


def _needs_rewrite(state: dict) -> str:
    if state.get("needs_revision") and state.get("revisions", 0) < 3:
        return "writer"
    return "finalize"


async def finalize_node(state: dict, emit: Emit) -> dict:
    await emit("node_start", "finalize", "Assembling final output")
    await emit("node_end", "finalize", "Done")
    return {"final": state.get("draft", "")}


async def _stream_text(
    provider: LLMProvider,
    system: str,
    prompt: str,
    node: str,
    emit: Emit,
) -> str:
    chunks: list[str] = []
    async for token in provider.stream(system, prompt):
        chunks.append(token)
        await emit("token", node, token)
    return "".join(chunks)
