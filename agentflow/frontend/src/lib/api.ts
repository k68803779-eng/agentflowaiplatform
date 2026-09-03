export type RunStatus = "queued" | "running" | "completed" | "failed";

export interface Run {
  id: string;
  topic: string;
  audience: string;
  tone: string;
  status: RunStatus;
  provider: string;
  plan: string[];
  research: string[];
  draft: string;
  review: string;
  final: string;
  error: string;
  revisions: number;
  created_at: string;
  updated_at: string;
}

export interface RunListItem {
  id: string;
  topic: string;
  status: RunStatus;
  provider: string;
  created_at: string;
  updated_at: string;
}

export interface AgentEvent {
  type: "node_start" | "node_end" | "token" | "info" | "error";
  node: string;
  content: string;
  ts: string;
}

export async function createRun(payload: {
  topic: string;
  audience: string;
  tone: string;
}): Promise<Run> {
  const res = await fetch("/api/runs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to create run: ${res.status}`);
  return res.json();
}

export async function getRun(id: string): Promise<Run> {
  const res = await fetch(`/api/runs/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch run: ${res.status}`);
  return res.json();
}

export async function listRuns(limit = 10): Promise<RunListItem[]> {
  const res = await fetch(`/api/runs?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to list runs: ${res.status}`);
  return res.json();
}
