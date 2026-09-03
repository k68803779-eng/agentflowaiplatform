import { useEffect, useRef, useState } from "react";

import type { AgentEvent, Run } from "@/lib/api";
import { getRun } from "@/lib/api";

export function useRunStream(runId: string) {
  const [run, setRun] = useState<Run | null>(null);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const bufferRef = useRef<AgentEvent[]>([]);

  useEffect(() => {
    let disposed = false;
    let es: EventSource | null = null;
    bufferRef.current = [];

    getRun(runId)
      .then((r) => {
        if (!disposed) setRun(r);
      })
      .catch(() => {});

    if (typeof window !== "undefined") {
      es = new EventSource(`/api/runs/${runId}/stream`);
      es.onopen = () => {
        if (!disposed) setConnected(true);
      };
      es.onmessage = (msg) => {
        try {
          const event = JSON.parse(msg.data) as AgentEvent;
          bufferRef.current = [...bufferRef.current, event];
          if (!disposed) setEvents(bufferRef.current);
        } catch {
          /* ignore malformed frames */
        }
      };
      es.addEventListener("done", () => {
        es?.close();
        if (!disposed) {
          setConnected(false);
          getRun(runId).then((r) => {
            if (!disposed) setRun(r);
          });
        }
      });
      es.onerror = () => {
        if (!disposed) setConnected(false);
      };
    }

    return () => {
      disposed = true;
      es?.close();
    };
  }, [runId]);

  return { run, events, connected };
}
