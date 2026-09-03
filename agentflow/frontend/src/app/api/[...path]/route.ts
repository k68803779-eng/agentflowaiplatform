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

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual",
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  const res = await fetch(target, init);
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
