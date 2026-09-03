import type { RunStatus } from "@/lib/api";

const STYLES: Record<RunStatus, string> = {
  queued: "border-border bg-background text-muted",
  running: "border-accent bg-accent/15 text-accent animate-pulse",
  completed: "border-accent-2/60 bg-accent-2/10 text-accent-2",
  failed: "border-danger bg-danger/10 text-danger",
};

export function StatusBadge({ status }: { status: RunStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${STYLES[status]}`}
    >
      {status}
    </span>
  );
}
