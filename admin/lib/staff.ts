import { NextRequest, NextResponse } from "next/server";

/** Shared by local API routes: confirms the bearer token belongs to a staff account on the Vaulten API. */
export const API_BASE = (process.env.API_URL || "http://127.0.0.1:4310/api/v1").replace(/\/+$/, "");

const RANK: Record<string, number> = { USER: 0, SUPPORT: 1, CONTENT_MANAGER: 2, ADMIN: 3, SUPER_ADMIN: 4 };

export function problem(status: number, code: string, detail: string) {
  return NextResponse.json({ type: "about:blank", title: code, status, code, detail }, { status, headers: { "Content-Type": "application/problem+json" } });
}

/** Returns the staff member, or a problem response to send back. */
export async function requireStaff(req: NextRequest, minRole = "SUPPORT"): Promise<{ id: string; role: string } | NextResponse> {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return problem(401, "UNAUTHENTICATED", "Missing bearer token.");
  const res = await fetch(`${API_BASE}/users/me`, { headers: { Authorization: `Bearer ${token}`, "X-Client-Platform": "admin-web" }, cache: "no-store" }).catch(() => null);
  if (!res) return problem(502, "UPSTREAM_UNREACHABLE", "The Vaulten API could not be reached.");
  if (res.status === 401) return problem(401, "UNAUTHENTICATED", "Your session expired. Sign in again.");
  if (!res.ok) return problem(502, "UPSTREAM", `Vaulten API answered ${res.status}.`);
  const me = ((await res.json()) as { data: { id: string; role: string } }).data;
  if ((RANK[me.role] ?? 0) < (RANK[minRole] ?? 1)) return problem(403, "FORBIDDEN", `This needs the ${minRole} role or higher.`);
  return me;
}
