import { NextRequest, NextResponse } from "next/server";
import { problem, requireStaff } from "@/lib/staff";

/**
 * Push notifications through OneSignal.
 * Server env: ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY (the REST key never reaches the browser).
 * Targets: everyone subscribed, everyone on one path (tag "path" set by the iOS app), or one user by Vaulten account id.
 */
const APP_ID = process.env.ONESIGNAL_APP_ID;
const REST_KEY = process.env.ONESIGNAL_REST_API_KEY;
const OS = "https://api.onesignal.com";

const notConfigured = () => problem(503, "PUSH_NOT_CONFIGURED", "OneSignal is not connected: set ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY on the server.");

async function onesignal(path: string, init: RequestInit = {}) {
  const res = await fetch(`${OS}${path}`, { ...init, headers: { Authorization: `Key ${REST_KEY}`, "Content-Type": "application/json", ...(init.headers ?? {}) }, cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(Array.isArray(json.errors) ? json.errors.join(", ") : JSON.stringify(json.errors ?? json).slice(0, 300)), { status: res.status });
  return json;
}

interface OsNotification { id: string; headings?: { en?: string }; contents?: { en?: string }; data?: { link?: string; audience?: string; userId?: string; path?: string } | null; successful?: number; failed?: number; converted?: number; remaining?: number; queued_at?: number; send_after?: number; completed_at?: number | null; canceled?: boolean }

/** History of sent and scheduled pushes. */
export async function GET(req: NextRequest) {
  const me = await requireStaff(req);
  if (me instanceof NextResponse) return me;
  if (!APP_ID || !REST_KEY) return notConfigured();
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") || 1));
  const pageSize = 25;
  try {
    const r = (await onesignal(`/notifications?app_id=${APP_ID}&limit=${pageSize}&offset=${(page - 1) * pageSize}&kind=1`)) as { total_count: number; notifications: OsNotification[] };
    const now = Date.now() / 1000;
    const data = r.notifications.map((n) => ({
      id: n.id,
      title: n.headings?.en ?? "",
      body: n.contents?.en ?? "",
      link: n.data?.link ?? null,
      audience: n.data?.audience ?? "all",
      userId: n.data?.userId ?? null,
      path: n.data?.path ?? null,
      status: n.canceled ? "canceled" : (n.send_after ?? 0) > now ? "scheduled" : n.completed_at ? "sent" : "sending",
      sentAt: new Date(((n.send_after ?? n.queued_at) ?? now) * 1000).toISOString(),
      delivered: n.successful ?? 0,
      failed: n.failed ?? 0,
      opened: n.converted ?? 0,
    }));
    return NextResponse.json({ data, meta: { page, pageSize, totalItems: r.total_count, totalPages: Math.max(1, Math.ceil(r.total_count / pageSize)) } });
  } catch (e) {
    return problem(502, "ONESIGNAL_ERROR", (e as Error).message);
  }
}

/** Send now or schedule. Body: { audience: "all"|"path"|"user", path?, userId?, title, body, link?, scheduledAt? } */
export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as { audience?: string; path?: string; userId?: string; title?: string; body?: string; link?: string | null; scheduledAt?: string | null };
  const me = await requireStaff(req, b.audience === "user" ? "SUPPORT" : "ADMIN");
  if (me instanceof NextResponse) return me;
  if (!APP_ID || !REST_KEY) return notConfigured();
  const title = (b.title ?? "").trim(), body = (b.body ?? "").trim();
  if (!title || !body) return problem(422, "VALIDATION_FAILED", "Title and message are required.");
  if (title.length > 80 || body.length > 240) return problem(422, "VALIDATION_FAILED", "Title is limited to 80 characters and the message to 240.");
  const audience = b.audience === "user" || b.audience === "path" ? b.audience : "all";
  if (audience === "user" && !b.userId) return problem(422, "VALIDATION_FAILED", "Pick a user.");
  if (audience === "path" && !b.path) return problem(422, "VALIDATION_FAILED", "Pick a path.");
  if (b.scheduledAt && new Date(b.scheduledAt).getTime() < Date.now() - 60_000) return problem(422, "VALIDATION_FAILED", "The scheduled time is in the past.");

  const payload: Record<string, unknown> = {
    app_id: APP_ID,
    target_channel: "push",
    headings: { en: title },
    contents: { en: body },
    data: { link: b.link || "/home", audience, userId: b.userId ?? null, path: b.path ?? null, sentBy: me.id },
    ios_sound: "default",
  };
  if (audience === "user") payload.include_aliases = { external_id: [b.userId] };
  else if (audience === "path") payload.filters = [{ field: "tag", key: "path", relation: "=", value: b.path }];
  else payload.included_segments = ["Total Subscriptions"];
  if (b.scheduledAt) payload.send_after = new Date(b.scheduledAt).toUTCString();

  try {
    const r = (await onesignal("/notifications?c=push", { method: "POST", body: JSON.stringify(payload) })) as { id?: string; errors?: unknown };
    if (!r.id) return NextResponse.json({ data: { id: null, status: "no_recipients", detail: "Nobody matches this audience yet (no subscribed device)." } });
    return NextResponse.json({ data: { id: r.id, status: b.scheduledAt ? "scheduled" : "sent" } });
  } catch (e) {
    return problem(502, "ONESIGNAL_ERROR", (e as Error).message);
  }
}

/** Cancel a scheduled push: DELETE /api/push?id=… */
export async function DELETE(req: NextRequest) {
  const me = await requireStaff(req, "ADMIN");
  if (me instanceof NextResponse) return me;
  if (!APP_ID || !REST_KEY) return notConfigured();
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return problem(422, "VALIDATION_FAILED", "Missing id.");
  try {
    await onesignal(`/notifications/${id}?app_id=${APP_ID}`, { method: "DELETE" });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return problem(502, "ONESIGNAL_ERROR", (e as Error).message);
  }
}
