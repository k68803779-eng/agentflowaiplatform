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

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("API is waking up. Wait 30-60s and try again.");
  }
}

async function request(url: string, init?: RequestInit, retries = 5): Promise<Response> {
  let last: Response | null = null;
  for (let i = 0; i < retries; i += 1) {
    try {
      const res = await fetch(url, { ...init, cache: "no-store" });
      last = res;
      const type = res.headers.get("content-type") || "";
      if (res.ok && type.includes("application/json")) return res;
    } catch {
      last = null;
    }
    await new Promise((r) => setTimeout(r, 4000 * (i + 1)));
  }
  if (!last) throw new Error("API is waking up. Wait 30-60s and try again.");
  return last;
}

export async function createRun(payload: {
  topic: string;
  audience: string;
  tone: string;
}): Promise<Run> {
  const res = await request("/api/runs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(
      res.status === 502 || res.status === 503 || res.status === 504
        ? "API is waking up. Wait 30-60s and try again."
        : `Failed to create run: ${res.status}`,
    );
  }
  return parseJson<Run>(res);
}

export async function getRun(id: string): Promise<Run> {
  const res = await request(`/api/runs/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch run: ${res.status}`);
  return parseJson<Run>(res);
}

export async function listRuns(limit = 10): Promise<RunListItem[]> {
  const res = await request(`/api/runs?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to list runs: ${res.status}`);
  return parseJson<RunListItem[]>(res);
}
