"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createRun } from "@/lib/api";

const AUDIENCES = ["developers", "product managers", "general readers", "executives", "students"];
const TONES = ["professional", "casual", "educational", "persuasive"];

export function RunForm() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("developers");
  const [tone, setTone] = useState("professional");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const run = await createRun({ topic: topic.trim(), audience, tone });
      router.push(`/runs/${run.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start the run");
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full rounded-xl border border-border bg-white/5 p-5 shadow-lg shadow-black/20 backdrop-blur"
    >
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
        What should the agents produce?
      </label>
      <input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="e.g. Why AI agents are the next big thing"
        className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted focus:border-accent"
        maxLength={200}
      />

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
            Audience
          </label>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
          >
            {AUDIENCES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
            Tone
          </label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
          >
            {TONES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={!topic.trim() || busy}
        className="mt-4 w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? "Starting pipeline…" : "Run the agent pipeline"}
      </button>
      <p className="mt-2 text-center text-xs text-muted">
        Planner → Researcher → Writer → Reviewer · revision loop built on LangGraph
      </p>
    </form>
  );
}
