"use client";

import { useEffect, useState } from "react";

interface HealthInfo {
  status: string;
  provider: string;
  llm_provider: string;
}

export function ProviderStatus() {
  const [info, setInfo] = useState<HealthInfo | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then(setInfo)
      .catch(() => {});
  }, []);

  const isOffline = info?.provider?.startsWith("offline");

  return (
    <div className="mx-auto mt-6 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-border bg-white/5 px-4 py-1.5 text-xs text-muted">
      <span
        className={`h-2 w-2 rounded-full ${isOffline ? "bg-border" : "bg-accent-2 animate-pulse"}`}
      />
      {info ? (
        <span>
          Active model: <span className="font-mono text-foreground">{info.provider}</span>
        </span>
      ) : (
        <span>Checking model provider…</span>
      )}
    </div>
  );
}
