"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { StatusBadge } from "@/components/StatusBadge";
import { listRuns, type RunListItem } from "@/lib/api";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function RunHistory() {
  const [runs, setRuns] = useState<RunListItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    listRuns(8)
      .then((rows) => {
        setRuns(rows);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded) {
    return <p className="text-sm text-muted">Loading runs…</p>;
  }
  if (runs.length === 0) {
    return <p className="text-sm text-muted">No runs yet — launch one above.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {runs.map((r) => (
        <li key={r.id}>
          <Link
            href={`/runs/${r.id}`}
            className="flex items-center justify-between gap-3 px-1 py-2.5 transition-colors hover:text-accent"
          >
            <span className="min-w-0 truncate text-sm">{r.topic}</span>
            <span className="flex shrink-0 items-center gap-2">
              <StatusBadge status={r.status} />
              <span className="w-14 text-right font-mono text-[11px] text-muted">
                {timeAgo(r.created_at)}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
