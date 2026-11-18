import { NextRequest, NextResponse } from "next/server";
import { API_BASE, problem, requireStaff } from "@/lib/staff";

/**
 * POST /api/video-pick { lessonId, attach?: boolean }
 * The coach's AI (Claude via OpenRouter, same key as the AI coach) picks the best YouTube video for a lesson:
 * candidates come from the Vaulten API (GET /admin/videos, which holds the YouTube key), Claude ranks them against
 * the lesson, and the winner is attached with PUT /admin/learning/lessons/:id/video unless attach is false.
 * Env: OPENROUTER_API_KEY, optional OPENROUTER_MODEL_SMART.
 */
const MODEL = process.env.OPENROUTER_MODEL_SMART ?? "anthropic/claude-opus-5.5";
const FALLBACK = "anthropic/claude-sonnet-5.5";

interface Candidate { videoId: string; title: string; channelTitle: string; durationSeconds: number; thumbnailUrl: string; url: string }
interface Lesson { id: string; title: string; summary: string; content: string; videoUrl: string | null; durationMinutes: number | null; category?: string | null }

async function upstream<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Client-Platform": "admin-web", "Accept-Language": "en" }, cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.detail ?? `Vaulten API answered ${res.status}`), { status: res.status, code: json.code });
  return json.data as T;
}

const SYSTEM = `You pick the single best YouTube video to accompany a lesson in Vaulten, an app that coaches beginners to their first revenue online.
Judge each candidate on: how directly it teaches this lesson's exact skill; practical, step-by-step value a beginner can act on today; clear, credible creator (no get-rich-quick hype, fake gurus, income screenshots or "passive income in 7 days" promises); reasonably current; length that fits a lesson (about 5-25 minutes is ideal).
Never pick music, songs, mixes, lyrics, ambient/lo-fi/study tracks, podcasts with no teaching, or anything that is not a person explaining the skill. Reject anything under 3 or over 30 minutes.
If no candidate is a good fit, return choice -1 rather than a weak match.
Answer only with JSON: {"choice": <index or -1>, "reason": "<one short sentence for the content team>", "searchQuery": "<a better YouTube search if choice is -1, else empty>"}`;

async function choose(lesson: Lesson, candidates: Candidate[], key: string) {
  const list = candidates.map((c, i) => `${i}. "${c.title}" by ${c.channelTitle}, ${Math.round(c.durationSeconds / 60)} min`).join("\n");
  const user = `Lesson: ${lesson.title}\nSummary: ${lesson.summary}\n${lesson.category ? `Category: ${lesson.category}\n` : ""}Lesson text (start): ${lesson.content.slice(0, 1500)}\n\nCandidates:\n${list}`;
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json", "X-Title": "Vaulten Admin" },
    body: JSON.stringify({
      models: [MODEL, FALLBACK], max_tokens: 2000,
      messages: [{ role: "system", content: SYSTEM }, { role: "user", content: user }],
      response_format: { type: "json_schema", json_schema: { name: "video_pick", strict: true, schema: { type: "object", additionalProperties: false, required: ["choice", "reason", "searchQuery"], properties: { choice: { type: "integer" }, reason: { type: "string" }, searchQuery: { type: "string" } } } } },
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw Object.assign(new Error(res.status === 429 ? "The AI is busy, try again in a minute." : `AI request failed (${res.status}).`), { status: 502 });
  const data = await res.json();
  const text = String(data.choices?.[0]?.message?.content ?? "").replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const out = JSON.parse(text) as { choice: number; reason: string; searchQuery: string };
  return { ...out, model: data.model as string };
}

export async function POST(req: NextRequest) {
  const me = await requireStaff(req, "CONTENT_MANAGER");
  if (me instanceof NextResponse) return me;
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return problem(503, "AI_NOT_CONFIGURED", "Set OPENROUTER_API_KEY (the AI coach key) on the admin server.");
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { lessonId, attach = true } = (await req.json().catch(() => ({}))) as { lessonId?: string; attach?: boolean };
  if (!lessonId) return problem(400, "VALIDATION_FAILED", "lessonId is required.");

  try {
    const lesson = await upstream<Lesson>(`/admin/learning/lessons/${lessonId}`, token);
    const search = (q: string) => upstream<Candidate[]>(`/admin/videos?q=${encodeURIComponent(q.slice(0, 200))}`, token);
    let query = lesson.title;
    let candidates = await search(query);
    let pick = candidates.length ? await choose(lesson, candidates, key) : { choice: -1, reason: "No results for the lesson title.", searchQuery: `${lesson.title} tutorial for beginners`, model: MODEL };
    // One retry with the AI's own search when nothing fit.
    if ((pick.choice < 0 || !candidates[pick.choice]) && pick.searchQuery) {
      query = pick.searchQuery;
      candidates = await search(query);
      if (candidates.length) pick = await choose(lesson, candidates, key);
    }
    const video = candidates[pick.choice];
    if (!video) return NextResponse.json({ data: { picked: null, reason: pick.reason, query, considered: candidates.length } });
    if (attach) await upstream(`/admin/learning/lessons/${lessonId}/video`, token, { method: "PUT", body: JSON.stringify({ url: video.url }) });
    return NextResponse.json({ data: { picked: video, reason: pick.reason, query, considered: candidates.length, attached: attach, model: pick.model } });
  } catch (e) {
    const err = e as Error & { status?: number; code?: string };
    return problem(err.status && err.status < 600 ? err.status : 502, err.code ?? "VIDEO_PICK_FAILED", err.message);
  }
}
