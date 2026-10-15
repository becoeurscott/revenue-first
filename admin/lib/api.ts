/**
 * Browser → Next proxy → Vaulten API.
 *
 * Success bodies are `{ data, meta? }`; errors are RFC 9457 problem details
 * (`{ code, title, detail, status, requestId, errors? }`). Callers branch on
 * `ApiError.code`, never on the message.
 */
const API_BASE = "/api/proxy";

export interface FieldError {
  field: string;
  code: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: string,
    public requestId?: string,
    public fields?: FieldError[],
  ) {
    super(message);
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
  params?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  /** Typed confirmation phrase for irreversible actions, sent as `x-confirm`. */
  confirm?: string;
}

export interface Page<T> {
  data: T[];
  meta: { page: number; pageSize: number; totalItems: number; totalPages: number };
}

/** A hook the auth provider installs so a 401 can try one silent refresh. */
let refreshHandler: (() => Promise<string | null>) | null = null;
export function setRefreshHandler(fn: typeof refreshHandler) {
  refreshHandler = fn;
}

async function parseError(res: Response): Promise<ApiError> {
  const body = await res.json().catch(() => ({}));
  const message =
    body.detail || body.title || body.error || res.statusText || `HTTP ${res.status}`;
  return new ApiError(res.status, message, body.code || "UNKNOWN", body.requestId, body.errors);
}

export async function raw(path: string, opts: RequestOptions = {}): Promise<Response> {
  const { method = "GET", body, token, params, headers: extra = {}, confirm } = opts;
  let url = `${API_BASE}${path}`;
  if (params) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
    }
    const qs = sp.toString();
    if (qs) url += `?${qs}`;
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Client-Platform": "admin-web",
    ...extra,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (confirm) headers["x-confirm"] = confirm;
  return fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    credentials: "include",
  });
}

export async function api<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  let res = await raw(path, opts);
  if (res.status === 401 && opts.token && refreshHandler) {
    const fresh = await refreshHandler();
    if (fresh) res = await raw(path, { ...opts, token: fresh });
  }
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  const json = JSON.parse(text);
  // Unwrap `{ data, meta }` — keep both when there is a meta (paginated lists).
  if (json && typeof json === "object" && "data" in json) {
    return ("meta" in json ? json : json.data) as T;
  }
  return json as T;
}

/** Routes served by this Next app itself (e.g. /api/analytics, /api/push), not proxied. */
export async function localApi<T = unknown>(path: string, token: string | null, params?: Record<string, string | number | undefined>, init: { method?: string; body?: unknown; keepMeta?: boolean } = {}): Promise<T> {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined && v !== "") sp.set(k, String(v));
  const qs = sp.toString();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = "Bearer " + token;
  const res = await fetch("/api" + path + (qs ? "?" + qs : ""), { method: init.method ?? "GET", headers, body: init.body === undefined ? undefined : JSON.stringify(init.body), cache: "no-store" });
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  const json = await res.json();
  if (init.keepMeta) return json as T;
  return (json && typeof json === "object" && "data" in json ? json.data : json) as T;
}

export function adminApi<T = unknown>(
  path: string,
  token: string | null,
  opts: Omit<RequestOptions, "token"> = {},
): Promise<T> {
  return api<T>(`/admin${path}`, { ...opts, token });
}

/** Download an export as a file; the filename comes from Content-Disposition. */
export async function downloadAdminFile(path: string, token: string, fallbackName: string) {
  const res = await raw(`/admin${path}`, { token });
  if (!res.ok) throw await parseError(res);
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  const name = match ? decodeURIComponent(match[1]) : fallbackName;
  const type = res.headers.get("Content-Type") ?? "";
  const blob = type.includes("text/csv")
    ? new Blob(["﻿", (await res.text()).replace(/^﻿/, "")], { type })
    : await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.fields?.length) return `${e.message} — ${e.fields.map((f) => `${f.field}: ${f.message}`).join(", ")}`;
    return e.message;
  }
  return e instanceof Error ? e.message : "Something went wrong";
}
