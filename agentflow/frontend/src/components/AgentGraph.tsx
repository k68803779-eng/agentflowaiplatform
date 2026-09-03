const PIPELINE = ["planner", "researcher", "writer", "reviewer"] as const;

interface AgentGraphProps {
  activeNode: string | null;
  visited: Set<string>;
  revisions: number;
  running: boolean;
}

export function AgentGraph({ activeNode, visited, revisions, running }: AgentGraphProps) {
  return (
    <div className="rounded-xl border border-border bg-white/5 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Agent pipeline
        </h2>
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`h-2 w-2 rounded-full ${running ? "animate-pulse bg-accent-2" : "bg-border"}`}
          />
          <span className="text-muted">{running ? "running" : "idle"}</span>
          {revisions > 0 && (
            <span className="rounded-full border border-accent px-2 py-0.5 font-mono text-accent">
              {revisions} rewrite{revisions > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PIPELINE.map((node, i) => {
          const isActive = activeNode === node;
          const isDone = visited.has(node);
          const stateColor = isActive
            ? "border-accent bg-accent/15 text-accent shadow-[0_0_18px_rgba(108,140,255,0.35)]"
            : isDone
              ? "border-accent-2/60 bg-accent-2/10 text-accent-2"
              : "border-border bg-background text-muted";
          return (
            <div key={node} className="flex items-center gap-2">
              {i > 0 && (
                <span className="text-muted" aria-hidden>
                  →
                </span>
              )}
              <div
                className={`rounded-lg border px-3 py-2 font-mono text-xs transition-all ${stateColor} ${isActive ? "scale-105" : ""}`}
              >
                {node}
              </div>
            </div>
          );
        })}
        <span className="text-muted" aria-hidden>
          →
        </span>
        <div
          className={`rounded-lg border px-3 py-2 font-mono text-xs transition-all ${
            activeNode === "finalize"
              ? "border-accent bg-accent/15 text-accent shadow-[0_0_18px_rgba(108,140,255,0.35)]"
              : visited.has("finalize")
                ? "border-accent-2/60 bg-accent-2/10 text-accent-2"
                : "border-border bg-background text-muted"
          }`}
        >
          finalize
        </div>
      </div>

      <p className="mt-3 text-xs text-muted">
        Reviewer sends the draft back to the writer when revision is needed; otherwise the
        pipeline finalizes the output.
      </p>
    </div>
  );
}
