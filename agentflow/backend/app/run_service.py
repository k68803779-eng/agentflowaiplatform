import asyncio
import json
import uuid
from datetime import datetime, timezone

from sqlalchemy import desc, select

from app.db import Run, RunEvent, SessionLocal
from app.graph import AgentState, build_graph
from app.llm import build_provider
from app.schemas import RunCreate, RunListItem, RunOut


def _iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class RunManager:
    def __init__(self) -> None:
        self._subscribers: dict[str, set[asyncio.Queue]] = {}
        self._history: dict[str, list[dict]] = {}

    def subscribe(self, run_id: str) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue()
        for event in self._history.get(run_id, []):
            queue.put_nowait(event)
        self._subscribers.setdefault(run_id, set()).add(queue)
        return queue

    def unsubscribe(self, run_id: str, queue: asyncio.Queue) -> None:
        subs = self._subscribers.get(run_id)
        if subs and queue in subs:
            subs.discard(queue)

    def _publish(self, run_id: str, event: dict) -> None:
        event["ts"] = _iso()
        self._history.setdefault(run_id, []).append(event)
        for queue in list(self._subscribers.get(run_id, set())):
            queue.put_nowait(event)

    async def run_async(self, run_id: str) -> None:
        provider = build_provider()

        async def _emit(kind: str, node: str, content: str) -> None:
            self._publish(run_id, {"type": kind, "node": node, "content": content})
            self._write_event(run_id, kind, node, content)

        try:
            run = self._get_run(run_id)
            if run is None:
                self._publish(run_id, {"type": "error", "node": "", "content": "Run not found"})
                return
            self._set_status(run_id, "running", provider_name=provider.name)
            self._publish(
                run_id,
                {
                    "type": "info",
                    "node": "system",
                    "content": f"Provider: {provider.name}",
                },
            )
            state: AgentState = {
                "topic": run.topic,
                "audience": run.audience,
                "tone": run.tone,
                "plan": [],
                "research": [],
                "draft": "",
                "review": "",
                "needs_revision": False,
                "revisions": 0,
                "final": "",
            }
            app = build_graph(provider, _emit)
            result = await app.ainvoke(state)
            self._set_status(run_id, "completed")
            self._update_result(run_id, result)
            self._publish(run_id, {"type": "done", "node": "", "content": ""})
        except Exception as exc:  # pragma: no cover - defensive
            self._set_status(run_id, "failed")
            self._mark_error(run_id, str(exc))
            self._publish(
                run_id,
                {"type": "error", "node": "", "content": f"Pipeline failed: {exc}"},
            )
            self._publish(run_id, {"type": "done", "node": "", "content": ""})
        finally:
            await self._close_provider(provider)

    def _write_event(self, run_id: str, kind: str, node: str, content: str) -> None:
        with SessionLocal() as db:
            db.add(RunEvent(run_id=run_id, kind=kind, node=node, content=content))
            db.commit()

    def _get_run(self, run_id: str) -> Run | None:
        with SessionLocal() as db:
            return db.get(Run, run_id)

    def _set_status(self, run_id: str, status: str, provider_name: str = "") -> None:
        with SessionLocal() as db:
            run = db.get(Run, run_id)
            if run is None:
                return
            run.status = status
            if provider_name:
                run.provider = provider_name
            db.commit()

    def _update_result(self, run_id: str, result: dict) -> None:
        with SessionLocal() as db:
            run = db.get(Run, run_id)
            if run is None:
                return
            run.plan_json = json.dumps(result.get("plan", []), ensure_ascii=False)
            run.research_json = json.dumps(
                result.get("research", []), ensure_ascii=False
            )
            run.draft = result.get("draft", "")
            run.review = result.get("review", "")
            run.final = result.get("final", "")
            run.revisions = int(result.get("revisions", 0))
            db.commit()

    def _mark_error(self, run_id: str, message: str) -> None:
        with SessionLocal() as db:
            run = db.get(Run, run_id)
            if run is None:
                return
            run.error = message
            db.commit()

    async def _close_provider(self, provider) -> None:
        close = getattr(provider, "aclose", None)
        if close:
            try:
                await close()
            except Exception:
                pass

    def create_run(self, payload: RunCreate) -> RunOut:
        run = Run(
            id=str(uuid.uuid4()),
            topic=payload.topic,
            audience=payload.audience,
            tone=payload.tone,
            status="queued",
        )
        with SessionLocal() as db:
            db.add(run)
            db.commit()
            db.refresh(run)
        return self._to_out(run)

    def get_run(self, run_id: str) -> RunOut | None:
        with SessionLocal() as db:
            run = db.get(Run, run_id)
            return self._to_out(run) if run else None

    def list_runs(self, limit: int = 20) -> list[RunListItem]:
        with SessionLocal() as db:
            rows = (
                db.execute(select(Run).order_by(desc(Run.created_at)).limit(limit))
                .scalars()
                .all()
            )
            return [
                RunListItem(
                    id=r.id,
                    topic=r.topic,
                    status=r.status,
                    provider=r.provider,
                    created_at=r.created_at,
                    updated_at=r.updated_at,
                )
                for r in rows
            ]

    def recent_events(self, run_id: str, limit: int = 200) -> list[dict]:
        with SessionLocal() as db:
            rows = (
                db.execute(
                    select(RunEvent)
                    .where(RunEvent.run_id == run_id)
                    .order_by(RunEvent.id.asc())
                    .limit(limit)
                )
                .scalars()
                .all()
            )
            return [
                {
                    "type": e.kind,
                    "node": e.node,
                    "content": e.content,
                    "ts": e.ts.isoformat(),
                }
                for e in rows
            ]

    @staticmethod
    def _to_out(run: Run) -> RunOut:
        return RunOut(
            id=run.id,
            topic=run.topic,
            audience=run.audience,
            tone=run.tone,
            status=run.status,
            provider=run.provider,
            plan=json.loads(run.plan_json or "[]"),
            research=json.loads(run.research_json or "[]"),
            draft=run.draft,
            review=run.review,
            final=run.final,
            error=run.error,
            revisions=run.revisions,
            created_at=run.created_at,
            updated_at=run.updated_at,
        )
