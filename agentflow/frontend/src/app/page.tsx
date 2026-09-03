import { ProviderStatus } from "@/components/ProviderStatus";
import { RunForm } from "@/components/RunForm";
import { RunHistory } from "@/components/RunHistory";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <section className="mb-8 text-center">
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.25em] text-accent">
          LangGraph · multi-agent · real-time
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          AgentFlow
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted">
          Describe a topic and watch four AI agents collaborate in real time — a
          planner outlines, a researcher gathers facts, a writer drafts, and a
          reviewer critiques until the output is ready.
        </p>
      </section>

      <RunForm />

      <ProviderStatus />

      <section className="mt-10">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">
          Recent runs
        </h2>
        <div className="rounded-xl border border-border bg-white/5 p-4">
          <RunHistory />
        </div>
      </section>

      <footer className="mt-12 text-center text-xs text-muted">
        Powered by LangGraph · FastAPI · Next.js — supports Gemini, OpenAI-compatible
        models, or offline mock mode (no API key required).
      </footer>
    </main>
  );
}
