"use client";

import { useEffect, useState } from "react";

interface HealthInfo {
  status: string;
  provider: string;
  llm_provider: string;
}

export function ProviderStatus() {
  const [info, setInfo] = useState<HealthInfo | null>(null);
  const [phase, setPhase] = useState<"loading" | "waking" | "ok" | "down">("loading");

  useEffect(() => {
    let cancelled = false;
    let attempt = 0;

    async function load() {
      while (!cancelled && attempt < 8) {
        try {
          const res = await fetch("/api/health", { cache: "no-store" });
          if (res.ok) {
            const text = await res.text();
            const data = JSON.parse(text) as HealthInfo;
            if (data?.status !== "ok") throw new Error("not ready");
            if (!cancelled) {
              setInfo(data);
              setPhase("ok");
            }
            return;
          }
        } catch {
          /* backend still spinning up */
        }
        attempt += 1;
        if (!cancelled) setPhase("waking");
        await new Promise((r) => setTimeout(r, 4000));
      }
      if (!cancelled) setPhase("down");
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const isOffline = info?.provider?.startsWith("offline");

  return (
    <div className="mx-auto mt-6 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-border bg-white/5 px-4 py-1.5 text-xs text-muted">
      <span
        className={`h-2 w-2 rounded-full ${
          phase === "ok" && !isOffline
            ? "bg-accent-2 animate-pulse"
            : phase === "ok"
              ? "bg-border"
              : "bg-danger animate-pulse"
        }`}
      />
      {phase === "ok" && info ? (
        <span>
          Active model: <span className="font-mono text-foreground">{info.provider}</span>
        </span>
      ) : phase === "waking" ? (
        <span>Waking API (Free plan sleeps after idle)…</span>
      ) : phase === "down" ? (
        <span>API unreachable. Open agentflow-api in Render and wait for Live.</span>
      ) : (
        <span>Checking model provider…</span>
      )}
    </div>
  );
}
