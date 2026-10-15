"use client";

import { ContentDocPage, ListEditor, Section, StringListEditor } from "@/components/doc";
import { Badge, Field } from "@/components/ui";

type Flag = { title: string; detail: string };
type Question = { id: string; question: string; why: string; options: { label: string; risk: number }[] };
type Verdict = { id: string; maxScore: number; title: string; summary: string; next: string[] };
type MentorCheck = { redFlags: Flag[]; greenFlags: Flag[]; questions: Question[]; verdicts: Verdict[] };

export default function MentorCheckPage() {
  return (
    <ContentDocPage<MentorCheck> docKey="mentor-check" title="Mentor check" subtitle="The tool that helps users tell real mentors from fake ones: the questionnaire, its scoring and the verdicts." tabs={[{ id: "questions", label: "Questions" }, { id: "verdicts", label: "Verdicts" }, { id: "flags", label: "Red & green flags" }]} render={(v, set, tab, editable) => (
      <>
        {tab === "questions" && (
          <Section title="Questions" hint="Each option carries a risk: 0 healthy, 1 caution, 2 red flag. Score = sum of risks / (questions × 2) × 100.">
            <div className="space-y-3">
              {v.questions.map((q, i) => (
                <div key={q.id} className="rounded-xl border border-line p-4 space-y-3">
                  <div className="flex items-center gap-2"><Badge tone="primary">Q{i + 1}</Badge><code className="text-xs text-faint">{q.id}</code>{editable && <button onClick={() => set({ ...v, questions: v.questions.filter((_, j) => j !== i) })} className="ml-auto text-xs text-muted hover:text-danger cursor-pointer">remove</button>}</div>
                  <Field label="Question"><input className="input" value={q.question} disabled={!editable} onChange={(e) => set({ ...v, questions: v.questions.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)) })} /></Field>
                  <Field label="Why it matters"><textarea className="input min-h-[60px]" value={q.why} disabled={!editable} onChange={(e) => set({ ...v, questions: v.questions.map((x, j) => (j === i ? { ...x, why: e.target.value } : x)) })} /></Field>
                  <ListEditor title="Options" items={q.options} editable={editable} labelOf={(o) => `${o.label} · risk ${o.risk}`} blank={() => ({ label: "", risk: 0 })} onChange={(options) => set({ ...v, questions: v.questions.map((x, j) => (j === i ? { ...x, options } : x)) })} fields={[{ key: "label", label: "Answer" }, { key: "risk", label: "Risk (0 healthy · 1 caution · 2 red flag)", kind: "number" }]} />
                </div>
              ))}
              {editable && <button onClick={() => set({ ...v, questions: [...v.questions, { id: `q-${Date.now()}`, question: "", why: "", options: [{ label: "", risk: 0 }, { label: "", risk: 1 }, { label: "", risk: 2 }] }] })} className="text-sm text-primary-text font-semibold cursor-pointer">+ Add question</button>}
            </div>
          </Section>
        )}
        {tab === "verdicts" && (
          <Section title="Verdicts" hint="Ordered by maxScore: the first verdict whose maxScore ≥ the score is shown.">
            <div className="space-y-3">
              {v.verdicts.map((vd, i) => (
                <div key={vd.id} className="rounded-xl border border-line p-4 grid sm:grid-cols-2 gap-3">
                  <Field label="Id"><input className="input" value={vd.id} disabled={!editable} onChange={(e) => set({ ...v, verdicts: v.verdicts.map((x, j) => (j === i ? { ...x, id: e.target.value } : x)) })} /></Field>
                  <Field label="Max score (0–100)"><input className="input" type="number" value={vd.maxScore} disabled={!editable} onChange={(e) => set({ ...v, verdicts: v.verdicts.map((x, j) => (j === i ? { ...x, maxScore: Number(e.target.value) } : x)) })} /></Field>
                  <Field label="Title"><input className="input" value={vd.title} disabled={!editable} onChange={(e) => set({ ...v, verdicts: v.verdicts.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} /></Field>
                  <Field label="Summary" className="sm:col-span-2"><textarea className="input min-h-[60px]" value={vd.summary} disabled={!editable} onChange={(e) => set({ ...v, verdicts: v.verdicts.map((x, j) => (j === i ? { ...x, summary: e.target.value } : x)) })} /></Field>
                  <Field label="Next steps" className="sm:col-span-2"><StringListEditor value={vd.next} editable={editable} onChange={(next) => set({ ...v, verdicts: v.verdicts.map((x, j) => (j === i ? { ...x, next } : x)) })} /></Field>
                </div>
              ))}
            </div>
          </Section>
        )}
        {tab === "flags" && (
          <div className="grid lg:grid-cols-2 gap-4">
            <Section title="Red flags"><ListEditor items={v.redFlags} onChange={(redFlags) => set({ ...v, redFlags })} editable={editable} labelOf={(f) => f.title} blank={() => ({ title: "", detail: "" })} fields={[{ key: "title", label: "Title", width: "sm:col-span-2" }, { key: "detail", label: "Detail", kind: "textarea" }]} /></Section>
            <Section title="Green flags"><ListEditor items={v.greenFlags} onChange={(greenFlags) => set({ ...v, greenFlags })} editable={editable} labelOf={(f) => f.title} blank={() => ({ title: "", detail: "" })} fields={[{ key: "title", label: "Title", width: "sm:col-span-2" }, { key: "detail", label: "Detail", kind: "textarea" }]} /></Section>
          </div>
        )}
      </>
    )} />
  );
}
