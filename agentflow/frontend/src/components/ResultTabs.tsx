"use client";

import { useState } from "react";

import type { Run } from "@/lib/api";

interface ResultTabsProps {
  run: Run | null;
  liveDraft: string;
}

export function ResultTabs({ run, liveDraft }: ResultTabsProps) {
  const [tab, setTab] = useState<"plan" | "research" | "draft" | "review" | "final">("final");

  const tabs = [
    { id: "final", label: "Final output" },
    { id: "draft", label: "Draft" },
    { id: "plan", label: "Plan" },
    { id: "research", label: "Research" },
    { id: "review", label: "Review" },
  ] as const;

  function content() {
    if (!run) {
      return liveDraft || "Waiting for the pipeline…";
    }
    switch (tab) {
      case "plan":
        return run.plan.length
          ? run.plan.map((p) => `• ${p}`).join("\n")
          : "No plan yet.";
      case "research":
        return run.research.length
          ? run.research.map((r) => `• ${r}`).join("\n")
          : "No research yet.";
      case "draft":
        return run.draft || liveDraft || "No draft yet.";
      case "review":
        return run.review || "No review yet.";
      case "final":
        return run.final || liveDraft || "The final output will appear here.";
    }
  }

  const live = tab === "draft" || tab === "final";

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white/5">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === t.id
                  ? "bg-accent/15 text-accent"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {live && <span className="hidden font-mono text-[10px] text-muted sm:block">live</span>}
      </div>
      <pre className="max-h-[420px] min-h-[180px] overflow-y-auto whitespace-pre-wrap px-4 py-4 font-mono text-[13px] leading-relaxed">
        {content()}
      </pre>
    </div>
  );
}
