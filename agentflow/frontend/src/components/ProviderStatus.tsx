"use client";

import { useEffect, useState } from "react";

import { apiUrl } from "@/lib/api";

interface HealthInfo {
  status: string;
  provider: string;
  llm_provider: string;
  has_gemini_key?: boolean;
  has_llm_key?: boolean;
  force_offline?: boolean;
  key_env_names?: string[];
}

export function ProviderStatus() {
  const [info, setInfo] = useState<HealthInfo | null>(null);
  const [phase, setPhase] = useState<"loading" | "waking" | "ok" | "down">("loading");
  const healthUrl = apiUrl("/api/health");

  useEffect(() => {
    let cancelled = false;
    let attempt = 0;

    async function load() {
      while (!cancelled && attempt < 10) {
        try {
          const res = await fetch(healthUrl, { cache: "no-store" });
          if (res.ok) {
            const data = JSON.parse(await res.text()) as HealthInfo;
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
        await new Promise((r) => setTimeout(r, 5000));
      }
      if (!cancelled) setPhase("down");
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [healthUrl]);

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
          {info.provider.startsWith("offline")
            ? ` — add USER_GEMINI_API_KEY on agentflow-api then Manual Deploy (seen: ${(info.key_env_names || []).join(", ") || "none"})`
            : ""}
        </span>
      ) : phase === "waking" ? (
        <span>Waking API (Free plan sleeps after idle)…</span>
      ) : phase === "down" ? (
        <a href={healthUrl} target="_blank" rel="noreferrer" className="underline">
          API sleeping — click to wake, then refresh this page
        </a>
      ) : (
        <span>Checking model provider…</span>
      )}
    </div>
  );
}
