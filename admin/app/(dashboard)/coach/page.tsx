"use client";

import { ContentDocPage, ListEditor, MapOfListsEditor, Section, StringListEditor, TagsInput } from "@/components/doc";
import { Badge, Field } from "@/components/ui";

type Reply = { id: string; keywords: string[]; text: Record<string, string>; followUps: string[] };
type Coach = { suggestedPrompts: Record<string, string[]>; replies: Reply[]; fallback: Reply; tips: Record<string, string[]>; conversations?: unknown[] };

function ReplyEditor({ r, editable, onChange, onRemove }: { r: Reply; editable: boolean; onChange: (r: Reply) => void; onRemove?: () => void }) {
  return (
    <div className="rounded-xl border border-line p-4 space-y-3">
      <div className="flex items-center gap-2"><code className="text-xs text-faint">{r.id}</code>{onRemove && editable && <button onClick={onRemove} className="ml-auto text-xs text-muted hover:text-danger cursor-pointer">remove</button>}</div>
      <Field label="Trigger keywords" hint="Any of these in the user's message selects this reply."><TagsInput value={r.keywords} editable={editable} onChange={(keywords) => onChange({ ...r, keywords })} /></Field>
      <div>
        <p className="text-[13px] font-medium text-fg mb-1.5">Answer per track <span className="text-xs text-muted font-normal">(clipping, gbp, youtube_owned… or “all” for every service track)</span></p>
        <div className="space-y-2">
          {Object.entries(r.text).map(([track, t]) => (
            <div key={track} className="flex gap-2 items-start"><Badge tone="primary">{track}</Badge><textarea className="input min-h-[70px]" value={t} disabled={!editable} onChange={(e) => onChange({ ...r, text: { ...r.text, [track]: e.target.value } })} />{editable && <button onClick={() => { const text = { ...r.text }; delete text[track]; onChange({ ...r, text }); }} className="text-xs text-muted hover:text-danger cursor-pointer mt-2">×</button>}</div>
          ))}
          {editable && <AddTrack onAdd={(k) => onChange({ ...r, text: { ...r.text, [k]: "" } })} existing={Object.keys(r.text)} />}
        </div>
      </div>
      <Field label="Follow-up suggestions"><StringListEditor value={r.followUps} editable={editable} onChange={(followUps) => onChange({ ...r, followUps })} /></Field>
    </div>
  );
}

function AddTrack({ onAdd, existing }: { onAdd: (k: string) => void; existing: string[] }) {
  const choices = ["all", "clipping", "gbp", "youtube_owned"].filter((c) => !existing.includes(c));
  if (!choices.length) return null;
  return <select className="input w-auto" value="" onChange={(e) => e.target.value && onAdd(e.target.value)}><option value="">+ add track…</option>{choices.map((c) => <option key={c} value={c}>{c}</option>)}</select>;
}

export default function CoachPage() {
  return (
    <ContentDocPage<Coach> docKey="coach" title="Coach" subtitle="Scripted answers, suggested prompts and daily tips of the in-app coach. The AI model and daily limit are in Settings." tabs={[{ id: "replies", label: "Replies" }, { id: "fallback", label: "Fallback" }, { id: "prompts", label: "Suggested prompts" }, { id: "tips", label: "Tips" }]} render={(v, set, tab, editable) => (
      <>
        {tab === "replies" && (
          <Section title="Scripted replies" hint="Matched by keyword before the AI model is called. Keep answers short and actionable.">
            <div className="space-y-3">
              {v.replies.map((r, i) => <ReplyEditor key={r.id} r={r} editable={editable} onChange={(nr) => set({ ...v, replies: v.replies.map((x, j) => (j === i ? nr : x)) })} onRemove={() => set({ ...v, replies: v.replies.filter((_, j) => j !== i) })} />)}
              {editable && <button onClick={() => set({ ...v, replies: [...v.replies, { id: `reply-${Date.now()}`, keywords: [], text: { all: "" }, followUps: [] }] })} className="text-sm text-primary-text font-semibold cursor-pointer">+ Add reply</button>}
            </div>
          </Section>
        )}
        {tab === "fallback" && <Section title="Fallback reply" hint="Used when no keyword matches and the model is unavailable."><ReplyEditor r={v.fallback} editable={editable} onChange={(fallback) => set({ ...v, fallback })} /></Section>}
        {tab === "prompts" && <Section title="Suggested prompts" hint="Chips shown above the composer, per track."><MapOfListsEditor value={v.suggestedPrompts} onChange={(suggestedPrompts) => set({ ...v, suggestedPrompts })} editable={editable} keyLabel="Track" /></Section>}
        {tab === "tips" && <Section title="Daily tips" hint="One is shown on the Coach tab each day, per track."><MapOfListsEditor value={v.tips} onChange={(tips) => set({ ...v, tips })} editable={editable} keyLabel="Track" /></Section>}
      </>
    )} />
  );
}
