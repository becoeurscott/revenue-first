import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy: the browser never talks to the Vaulten API directly.
 * API_URL must include the version prefix (`…/api/v1`); a missing prefix
 * turns every call into a 404, so the resolved upstream is logged once.
 */
const API_BASE = (process.env.API_URL || "http://127.0.0.1:4310/api/v1").replace(/\/+$/, "");
let logged = false;

async function handler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  if (!logged) {
    logged = true;
    console.log(`[admin proxy] upstream = ${API_BASE}`);
  }
  const { path } = await params;
  const url = new URL(`${API_BASE}/${path.join("/")}`);
  req.nextUrl.searchParams.forEach((v, k) => url.searchParams.append(k, v));

  const headers: Record<string, string> = {};
  for (const h of [
    "authorization",
    "content-type",
    "x-confirm",
    "x-client-platform",
    "x-requested-with",
    "x-request-id",
    "idempotency-key",
    "cookie",
    "accept",
  ]) {
    const v = req.headers.get(h);
    if (v) headers[h] = v;
  }
  // The API's audit log and IP allowlist should see the operator, not this server.
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) headers["x-forwarded-for"] = fwd;

  const body = req.method !== "GET" && req.method !== "HEAD" ? await req.text() : undefined;

  let res: Response;
  try {
    res = await fetch(url.toString(), { method: req.method, headers, body, redirect: "manual" });
  } catch (e) {
    return NextResponse.json(
      {
        type: "about:blank",
        title: "Upstream unreachable",
        status: 502,
        code: "UPSTREAM_UNREACHABLE",
        detail: `Could not reach ${url.origin}: ${e instanceof Error ? e.message : String(e)}`,
      },
      { status: 502, headers: { "Content-Type": "application/problem+json" } },
    );
  }

  const out = new Headers();
  const ct = res.headers.get("Content-Type");
  if (ct) out.set("Content-Type", ct);
  const disposition = res.headers.get("Content-Disposition");
  if (disposition) out.set("Content-Disposition", disposition);
  // Admin-web refresh sessions ride on an HttpOnly cookie set by the API.
  const cookies = (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
  for (const c of cookies) out.append("Set-Cookie", c);

  return new NextResponse(res.status === 204 ? null : await res.arrayBuffer(), { status: res.status, headers: out });
}

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const PUT = handler;
export const DELETE = handler;
