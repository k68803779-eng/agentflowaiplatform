import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function backendBase(): string {
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL.replace(/\/$/, "");
  }
  if (process.env.BACKEND_HOST) {
    return `https://${process.env.BACKEND_HOST}`;
  }
  return "http://localhost:8000";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function proxy(req: NextRequest, path: string[]): Promise<Response> {
  const target = `${backendBase()}/api/${path.join("/")}${req.nextUrl.search}`;
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === "host" || lower === "connection" || lower === "content-length") {
      return;
    }
    headers.set(key, value);
  });

  const body =
    req.method !== "GET" && req.method !== "HEAD" ? await req.arrayBuffer() : undefined;
  const isStream = path.includes("stream");
  const attempts = isStream ? 1 : 4;

  let lastError: unknown = null;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const init: RequestInit = {
        method: req.method,
        headers,
        redirect: "manual",
        cache: "no-store",
      };
      if (body) init.body = body;

      const res = await fetch(target, init);
      const type = res.headers.get("content-type") || "";
      const waking =
        res.status === 502 ||
        res.status === 503 ||
        res.status === 504 ||
        (!isStream && res.ok && !type.includes("application/json") && !type.includes("text/event-stream"));
      if (waking && i < attempts - 1) {
        await sleep(4000 * (i + 1));
        continue;
      }

      const outHeaders = new Headers();
      res.headers.forEach((value, key) => {
        const lower = key.toLowerCase();
        if (lower === "transfer-encoding" || lower === "connection") return;
        outHeaders.set(key, value);
      });

      if (outHeaders.get("content-type")?.includes("text/event-stream")) {
        outHeaders.set("Cache-Control", "no-cache, no-transform");
        outHeaders.set("X-Accel-Buffering", "no");
      }

      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers: outHeaders,
      });
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) {
        await sleep(4000 * (i + 1));
        continue;
      }
    }
  }

  const message = lastError instanceof Error ? lastError.message : "Backend unavailable";
  return Response.json(
    { detail: `API is waking up or unreachable: ${message}` },
    { status: 503 },
  );
}

type RouteCtx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, (await ctx.params).path);
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, (await ctx.params).path);
}

export async function PUT(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, (await ctx.params).path);
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, (await ctx.params).path);
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, (await ctx.params).path);
}

export async function HEAD(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, (await ctx.params).path);
}

export async function OPTIONS(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, (await ctx.params).path);
}
