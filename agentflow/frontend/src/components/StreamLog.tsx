"use client";

import { useEffect, useRef } from "react";

import type { AgentEvent } from "@/lib/api";

function eventClass(event: AgentEvent): string {
  switch (event.type) {
    case "node_start":
      return "text-accent";
    case "node_end":
      return "text-accent-2";
    case "info":
      return "text-muted";
    case "error":
      return "text-danger";
    default:
      return "text-foreground/80";
  }
}

function eventLabel(event: AgentEvent): string {
  switch (event.type) {
    case "node_start":
      return "●";
    case "node_end":
      return "✓";
    case "info":
      return "ℹ";
    case "error":
      return "✕";
    default:
      return "▍";
  }
}

export function StreamLog({ events }: { events: AgentEvent[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [events.length]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-[#070a12]">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          Live agent log
        </span>
        <span className="font-mono text-[10px] text-muted">{events.length} events</span>
      </div>
      <div
        ref={ref}
        className="h-56 overflow-y-auto px-4 py-3 font-mono text-[11px] leading-relaxed"
      >
        {events.length === 0 && (
          <span className="text-muted">Waiting for the pipeline to start…</span>
        )}
        {events.map((event, i) => (
          <div key={i} className="flex gap-2">
            <span className={`shrink-0 ${eventClass(event)}`}>{eventLabel(event)}</span>
            <span className="text-muted">{event.node ? `[${event.node}] ` : ""}</span>
            <span className={eventClass(event)}>{event.content}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
