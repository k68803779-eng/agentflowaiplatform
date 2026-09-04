import asyncio
import json
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse

import os

from app.config import get_settings
from app.llm import build_provider
from app.run_service import RunManager
from app.schemas import RunCreate, RunListItem, RunOut

router = APIRouter(prefix="/api")
manager = RunManager()


def _present_key_names() -> list[str]:
    needles = ("KEY", "GEMINI", "LLM", "OPENAI", "DEEPSEEK")
    names = []
    for name in os.environ:
        upper = name.upper()
        if any(n in upper for n in needles):
            names.append(name)
    return sorted(names)


@router.get("/health")
async def health() -> dict:
    settings = get_settings()
    raw = os.getenv("USER_GEMINI_API_KEY")
    return {
        "status": "ok",
        "provider": build_provider().name,
        "llm_provider": settings.llm_provider,
        "has_gemini_key": bool(settings.gemini_key()),
        "has_llm_key": bool(settings.openai_key()),
        "force_offline": settings.force_offline,
        "key_env_names": _present_key_names(),
        "user_gemini_api_key_set": raw is not None,
        "user_gemini_api_key_len": len((raw or "").strip()),
    }


@router.post("/runs", response_model=RunOut, status_code=201)
async def create_run(payload: RunCreate) -> RunOut:
    run = manager.create_run(payload)
    asyncio.create_task(manager.run_async(run.id))
    return run


@router.get("/runs", response_model=list[RunListItem])
async def list_runs(limit: int = 20) -> list[RunListItem]:
    return manager.list_runs(limit=limit)


@router.get("/runs/{run_id}", response_model=RunOut)
async def get_run(run_id: str) -> RunOut:
    run = manager.get_run(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


@router.get("/runs/{run_id}/stream")
async def stream_run(run_id: str) -> EventSourceResponse:
    if manager.get_run(run_id) is None:
        raise HTTPException(status_code=404, detail="Run not found")
    queue = manager.subscribe(run_id)
    return EventSourceResponse(_event_generator(run_id, queue))


async def _event_generator(run_id: str, queue: asyncio.Queue) -> AsyncGenerator[dict, None]:
    try:
        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=15.0)
            except asyncio.TimeoutError:
                yield {"event": "heartbeat", "data": "{}"}
                continue
            if event.get("type") == "done":
                yield {"event": "done", "data": json.dumps(event)}
                break
            yield {"event": "message", "data": json.dumps(event)}
    finally:
        manager.unsubscribe(run_id, queue)
