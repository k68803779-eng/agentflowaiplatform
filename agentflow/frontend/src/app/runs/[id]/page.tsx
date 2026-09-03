"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";

import { AgentGraph } from "@/components/AgentGraph";
import { ResultTabs } from "@/components/ResultTabs";
import { StatusBadge } from "@/components/StatusBadge";
import { StreamLog } from "@/components/StreamLog";
import { useRunStream } from "@/hooks/useRunStream";

export default function RunPage() {
  const params = useParams<{ id: string }>();
  const runId = params.id;
  const { run, events, connected } = useRunStream(runId);

  const { activeNode, visited, liveDraft } = useMemo(() => {
    const visited = new Set<string>();
    let active: string | null = null;
    const tokens: string[] = [];
    for (const event of events) {
      if (event.type === "node_start") {
        active = event.node;
        visited.add(event.node);
      } else if (event.type === "node_end" && active === event.node) {
        active = null;
      } else if (event.type === "token" && event.node === "writer") {
        tokens.push(event.content);
      }
    }
    return { activeNode: active, visited, liveDraft: tokens.join("") };
  }, [events]);

  const running = (run?.status === "running" || run?.status === "queued") || connected;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/"
            className="text-xs text-muted transition-colors hover:text-accent"
          >
            ← Back to all runs
          </Link>
          <h1 className="mt-1 truncate text-xl font-semibold">{run?.topic ?? "Loading…"}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
            {run && (
              <>
                <StatusBadge status={run.status} />
                <span className="font-mono">{run.provider}</span>
                <span>· {run.audience}</span>
                <span>· {run.tone}</span>
              </>
            )}
          </div>
        </div>
        <span className="shrink-0 font-mono text-[10px] text-muted">
          {runId.slice(0, 8)}
        </span>
      </div>

      <div className="mb-6">
        <AgentGraph
          activeNode={activeNode}
          visited={visited}
          revisions={run?.revisions ?? 0}
          running={running}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <StreamLog events={events} />
        </div>
        <div className="lg:col-span-3">
          <ResultTabs run={run} liveDraft={liveDraft} />
        </div>
      </div>
    </main>
  );
}
