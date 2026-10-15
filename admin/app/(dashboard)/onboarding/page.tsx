"use client";

import { useMemo, useState } from "react";
import Topbar from "@/components/Topbar";
import { useAuth } from "@/lib/auth";
import { adminApi } from "@/lib/api";
import { useDraft, useLoad, useNotice, nz, num } from "@/lib/hooks";
import type { AdminCategory, AdminOption, AdminQuestion, AdminRule, PreviewRecommendation, QuestionType, RuleEffect, RuleOperator } from "@/lib/types";
import { QUESTION_TYPES, RULE_EFFECTS, RULE_OPERATORS } from "@/lib/types";
import { Badge, Btn, Card, DataState, Drawer, Field, Modal, Notice, Tabs, Toggle } from "@/components/ui";
import { LifecycleButtons, StatusBadge, usePaths } from "@/components/content";
import { Icon } from "@/components/Icon";

export default function OnboardingPage() {
  const { token, can } = useAuth();
  const { notice, ok, fail, clear } = useNotice();
  const [tab, setTab] = useState("questionnaire");
  const { data: cats, loading, error, reload } = useLoad(() => adminApi<AdminCategory[]>("/onboarding/questionnaire", token), [token]);
  const { data: paths } = usePaths();
  const editable = can("CONTENT_MANAGER");
  const qCount = cats?.reduce((s, c) => s + c.questions.length, 0);
  return (
    <>
      <Topbar title="Onboarding" subtitle="The questionnaire new users answer, the weights that score each path, and the rules that boost or exclude paths." pill={cats ? `${cats.length} categories · ${qCount} questions` : undefined} />
      {notice && <div className="mb-4"><Notice kind={notice.kind} onDismiss={clear}>{notice.text}</Notice></div>}
      <Tabs className="mb-4" active={tab} onChange={setTab} tabs={[{ id: "questionnaire", label: "Questionnaire" }, { id: "rules", label: "Rules" }, { id: "preview", label: "Preview recommendation" }]} />
      {tab === "questionnaire" && <Questionnaire cats={cats} loading={loading} error={error} reload={reload} paths={paths ?? []} editable={editable} ok={ok} fail={fail} />}
      {tab === "rules" && <Rules cats={cats ?? []} paths={paths ?? []} editable={editable} ok={ok} fail={fail} />}
      {tab === "preview" && <Preview cats={cats ?? []} />}
    </>
  );
}

/* ------------------------------------------------------------- questionnaire */

function Questionnaire({ cats, loading, error, reload, paths, editable, ok, fail }: { cats: AdminCategory[] | null; loading: boolean; error: string | null; reload: () => void; paths: { id: string; name: string }[]; editable: boolean; ok: (m: string) => void; fail: (e: unknown) => void }) {
  const { token } = useAuth();
  const [openQ, setOpenQ] = useState<AdminQuestion | null>(null);
  const [newCat, setNewCat] = useState(false);
  const [newQ, setNewQ] = useState<AdminCategory | null>(null);
  const run = (label: string, fn: () => Promise<unknown>) => fn().then(() => { ok(label); reload(); }).catch(fail);
  return (
    <DataState loading={loading && !cats} error={error} onRetry={reload} empty={cats?.length === 0} emptyLabel="No category yet.">
      <div className="space-y-4">
        {cats?.sort((a, b) => a.position - b.position).map((c) => (
          <Card key={c.id} pad={false}>
            <CategoryHeader cat={c} editable={editable} onSaved={(m) => { ok(m); reload(); }} onError={fail} onAddQuestion={() => setNewQ(c)} run={run} />
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] uppercase tracking-wide text-faint border-t border-line"><th className="px-5 py-2 font-semibold">Question</th><th className="px-3 py-2 font-semibold">Key</th><th className="px-3 py-2 font-semibold">Type</th><th className="px-3 py-2 font-semibold">Options</th><th className="px-3 py-2 font-semibold">Required</th><th className="px-5 py-2 font-semibold">Status</th></tr></thead>
              <tbody>
                {[...c.questions].sort((a, b) => a.position - b.position).map((q) => (
                  <tr key={q.id} onClick={() => setOpenQ(q)} className="border-t border-line hover:bg-sunken/60 cursor-pointer">
                    <td className="px-5 py-3"><p className="font-medium text-fg">{q.prompt}</p>{q.helpText && <p className="text-xs text-muted">{q.helpText}</p>}</td>
                    <td className="px-3 py-3"><code className="text-xs font-mono text-muted">{q.key}</code></td>
                    <td className="px-3 py-3"><Badge tone="primary">{q.type.replace("_", " ").toLowerCase()}</Badge></td>
                    <td className="px-3 py-3 text-muted">{q.options.length ? `${q.options.length} · ${q.options.reduce((s, o) => s + o.weights.reduce((x, w) => x + w.points, 0), 0)} pts` : q.type === "SCALE" || q.type === "NUMBER" ? `${q.minValue ?? "−∞"}–${q.maxValue ?? "∞"}` : "free text"}</td>
                    <td className="px-3 py-3">{q.isRequired ? <Badge tone="warning">required</Badge> : <span className="text-xs text-faint">optional</span>}</td>
                    <td className="px-5 py-3"><StatusBadge status={q.status} /></td>
                  </tr>
                ))}
                {!c.questions.length && <tr><td colSpan={6} className="px-5 py-6 text-center text-sm text-muted">No question in this category.</td></tr>}
              </tbody>
            </table>
          </Card>
        ))}
        {editable && <Btn tone="neutral" onClick={() => setNewCat(true)}><Icon name="plus" className="w-4 h-4" /> Add category</Btn>}
      </div>
      {openQ && <QuestionDrawer q={cats!.flatMap((c) => c.questions).find((x) => x.id === openQ.id) ?? openQ} paths={paths} editable={editable} onClose={() => setOpenQ(null)} onChanged={(m) => { ok(m); reload(); }} onError={fail} />}
      <Modal open={newCat} onClose={() => setNewCat(false)} title="New category"><SimpleForm fields={[["title", "Title"], ["description", "Description"]]} submit="Create draft" onCancel={() => setNewCat(false)} onSubmit={async (v) => { await run("Category created", () => adminApi("/onboarding/categories", token, { method: "POST", body: v })); setNewCat(false); }} /></Modal>
      <Modal open={!!newQ} onClose={() => setNewQ(null)} title={`New question · ${newQ?.title}`}>
        <NewQuestionForm onCancel={() => setNewQ(null)} onSubmit={async (v) => { await run("Question created", () => adminApi("/onboarding/questions", token, { method: "POST", body: { ...v, categoryId: newQ!.id } })); setNewQ(null); }} />
      </Modal>
    </DataState>
  );
}

function CategoryHeader({ cat, editable, onSaved, onError, onAddQuestion, run }: { cat: AdminCategory; editable: boolean; onSaved: (m: string) => void; onError: (e: unknown) => void; onAddQuestion: () => void; run: (l: string, fn: () => Promise<unknown>) => Promise<void> }) {
  const { token } = useAuth();
  const [edit, setEdit] = useState(false);
  const draft = useDraft<{ title: string; description: string; position: number }>({ title: cat.title, description: cat.description, position: cat.position });
  return (
    <div className="px-5 pt-4 pb-3">
      {edit && draft.draft ? (
        <div className="grid sm:grid-cols-[1fr_1fr_90px_auto] gap-3 items-end">
          <Field label="Title"><input className="input" value={draft.draft.title} onChange={(e) => draft.set("title", e.target.value)} /></Field>
          <Field label="Description"><input className="input" value={draft.draft.description} onChange={(e) => draft.set("description", e.target.value)} /></Field>
          <Field label="Position"><input className="input" type="number" value={draft.draft.position} onChange={(e) => draft.set("position", Number(e.target.value))} /></Field>
          <div className="flex gap-2"><Btn solid size="sm" disabled={!draft.dirty} onClick={() => adminApi(`/onboarding/categories/${cat.id}`, token, { method: "PATCH", body: draft.changed() }).then(() => { setEdit(false); onSaved("Category saved"); }).catch(onError)}>Save</Btn><Btn tone="neutral" size="sm" onClick={() => setEdit(false)}>Cancel</Btn></div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-primary-light text-primary-text grid place-items-center font-bold text-sm">{cat.position + 1}</span>
          <div className="min-w-0 flex-1"><p className="font-bold text-fg">{cat.title}</p><p className="text-xs text-muted">{cat.description}</p></div>
          <StatusBadge status={cat.status} />
          {editable && <>
            <Btn tone="neutral" size="xs" onClick={() => setEdit(true)}>Edit</Btn>
            <Btn tone="neutral" size="xs" onClick={onAddQuestion}><Icon name="plus" className="w-3 h-3" /> Question</Btn>
            <LifecycleButtons status={cat.status} onPublish={() => run("Category published", () => adminApi(`/onboarding/categories/${cat.id}/publish`, token, { method: "POST" }))} onArchive={() => run("Category archived", () => adminApi(`/onboarding/categories/${cat.id}/archive`, token, { method: "POST" }))} />
          </>}
        </div>
      )}
    </div>
  );
}

function QuestionDrawer({ q, paths, editable, onClose, onChanged, onError }: { q: AdminQuestion; paths: { id: string; name: string }[]; editable: boolean; onClose: () => void; onChanged: (m: string) => void; onError: (e: unknown) => void }) {
  const { token } = useAuth();
  const draft = useDraft<{ prompt: string; helpText: string; isRequired: boolean; minValue: string; maxValue: string; position: number }>({ prompt: q.prompt, helpText: q.helpText ?? "", isRequired: q.isRequired, minValue: q.minValue?.toString() ?? "", maxValue: q.maxValue?.toString() ?? "", position: q.position });
  const [busy, setBusy] = useState(false);
  const [addOpt, setAddOpt] = useState(false);
  const run = async (label: string, fn: () => Promise<unknown>) => { setBusy(true); try { await fn(); onChanged(label); } catch (e) { onError(e); } finally { setBusy(false); } };
  const d = draft.draft;
  if (!d) return null;
  const choice = q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE";
  return (
    <Drawer open onClose={onClose} title={q.prompt} dirty={draft.dirty} footer={editable && (
      <>
        <Btn solid disabled={!draft.dirty || busy} onClick={() => { const c = draft.changed(); const body: Record<string, unknown> = { ...c }; if ("helpText" in c) body.helpText = nz(c.helpText!); if ("minValue" in c) body.minValue = num(c.minValue!); if ("maxValue" in c) body.maxValue = num(c.maxValue!); run("Question saved", () => adminApi(`/onboarding/questions/${q.id}`, token, { method: "PATCH", body })); }}>Save{draft.dirty ? ` (${draft.dirtyCount})` : ""}</Btn>
        <div className="ml-auto flex gap-2"><LifecycleButtons status={q.status} disabled={busy} onPublish={() => run("Question published", () => adminApi(`/onboarding/questions/${q.id}/publish`, token, { method: "POST" }))} onArchive={() => run("Question archived", () => adminApi(`/onboarding/questions/${q.id}/archive`, token, { method: "POST" }))} /></div>
      </>
    )}>
      <div className="space-y-5">
        <div className="flex items-center gap-3"><StatusBadge status={q.status} /><Badge tone="primary">{q.type.replace("_", " ").toLowerCase()}</Badge><code className="text-xs font-mono text-faint">key: {q.key}</code></div>
        <Field label="Prompt"><input className="input" value={d.prompt} disabled={!editable} onChange={(e) => draft.set("prompt", e.target.value)} /></Field>
        <Field label="Help text"><input className="input" value={d.helpText} disabled={!editable} onChange={(e) => draft.set("helpText", e.target.value)} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Position"><input className="input" type="number" value={d.position} disabled={!editable} onChange={(e) => draft.set("position", Number(e.target.value))} /></Field>
          {(q.type === "SCALE" || q.type === "NUMBER") && <><Field label="Min"><input className="input" type="number" value={d.minValue} disabled={!editable} onChange={(e) => draft.set("minValue", e.target.value)} /></Field><Field label="Max"><input className="input" type="number" value={d.maxValue} disabled={!editable} onChange={(e) => draft.set("maxValue", e.target.value)} /></Field></>}
        </div>
        <label className="flex items-center gap-3 rounded-xl border border-line p-3"><Toggle checked={d.isRequired} disabled={!editable} onChange={(v) => draft.set("isRequired", v)} /><span className="text-sm"><b>Required</b> to finish onboarding</span></label>
        {choice && (
          <section>
            <div className="flex items-center mb-2"><h3 className="text-sm font-bold text-fg">Options & path weights</h3><span className="text-xs text-muted ml-2">points added to each path when the option is picked</span>{editable && <Btn size="sm" tone="neutral" className="ml-auto" onClick={() => setAddOpt(true)}><Icon name="plus" className="w-3.5 h-3.5" /> Option</Btn>}</div>
            <div className="space-y-2">{[...q.options].sort((a, b) => a.position - b.position).map((o) => <OptionRow key={o.id} q={q} o={o} paths={paths} editable={editable} onChanged={onChanged} onError={onError} />)}</div>
          </section>
        )}
      </div>
      <Modal open={addOpt} onClose={() => setAddOpt(false)} title="Add an option"><SimpleForm fields={[["label", "Label"], ["value", "Value (stable id)"]]} submit="Add" onCancel={() => setAddOpt(false)} onSubmit={async (v) => { await run("Option added", () => adminApi(`/onboarding/questions/${q.id}/options`, token, { method: "POST", body: v })); setAddOpt(false); }} /></Modal>
    </Drawer>
  );
}

function OptionRow({ q, o, paths, editable, onChanged, onError }: { q: AdminQuestion; o: AdminOption; paths: { id: string; name: string }[]; editable: boolean; onChanged: (m: string) => void; onError: (e: unknown) => void }) {
  const { token } = useAuth();
  const [label, setLabel] = useState(o.label);
  const [weights, setWeights] = useState<Record<string, number>>(() => Object.fromEntries(paths.map((p) => [p.id, o.weights.find((w) => w.pathId === p.id)?.points ?? 0])));
  const dirtyW = paths.some((p) => (o.weights.find((w) => w.pathId === p.id)?.points ?? 0) !== weights[p.id]);
  return (
    <div className="rounded-xl border border-line p-3 grid sm:grid-cols-[1fr_auto] gap-3 items-center">
      <div className="flex items-center gap-2">
        <input className="input" value={label} disabled={!editable} onChange={(e) => setLabel(e.target.value)} onBlur={() => label !== o.label && adminApi(`/onboarding/questions/${q.id}/options/${o.id}`, token, { method: "PATCH", body: { label } }).then(() => onChanged("Option renamed")).catch(onError)} />
        <code className="text-[11px] text-faint font-mono whitespace-nowrap">{o.value}</code>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {paths.map((p) => <label key={p.id} className="flex items-center gap-1 text-xs"><span className="text-muted">{p.name}</span><input type="number" className="input w-16 py-1 text-center" value={weights[p.id]} disabled={!editable} onChange={(e) => setWeights({ ...weights, [p.id]: Number(e.target.value) })} /></label>)}
        {dirtyW && editable && <Btn size="xs" solid onClick={() => adminApi(`/onboarding/questions/${q.id}/options/${o.id}/weights`, token, { method: "PUT", body: { weights: paths.map((p) => ({ pathId: p.id, points: weights[p.id] })) } }).then(() => onChanged("Weights saved")).catch(onError)}>Save weights</Btn>}
      </div>
    </div>
  );
}

function NewQuestionForm({ onSubmit, onCancel }: { onSubmit: (v: { key: string; prompt: string; helpText: string | null; type: QuestionType; isRequired: boolean }) => Promise<void>; onCancel: () => void }) {
  const [v, setV] = useState({ key: "", prompt: "", helpText: "", type: "SINGLE_CHOICE" as QuestionType, isRequired: true });
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-3">
      <Field label="Prompt"><input className="input" value={v.prompt} onChange={(e) => setV({ ...v, prompt: e.target.value })} autoFocus /></Field>
      <Field label="Key" hint="Stable identifier used by rules; cannot change later."><input className="input font-mono" value={v.key} onChange={(e) => setV({ ...v, key: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") })} /></Field>
      <Field label="Type" hint="Cannot change later."><select className="input" value={v.type} onChange={(e) => setV({ ...v, type: e.target.value as QuestionType })}>{QUESTION_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ").toLowerCase()}</option>)}</select></Field>
      <Field label="Help text"><input className="input" value={v.helpText} onChange={(e) => setV({ ...v, helpText: e.target.value })} /></Field>
      <label className="flex items-center gap-3"><Toggle checked={v.isRequired} onChange={(b) => setV({ ...v, isRequired: b })} /><span className="text-sm">Required</span></label>
      <div className="flex gap-2 pt-2"><Btn solid disabled={!v.key || !v.prompt || busy} onClick={async () => { setBusy(true); try { await onSubmit({ ...v, helpText: nz(v.helpText) }); } finally { setBusy(false); } }}>Create draft</Btn><Btn tone="neutral" onClick={onCancel} className="ml-auto">Cancel</Btn></div>
    </div>
  );
}

function SimpleForm({ fields, submit, onSubmit, onCancel }: { fields: [string, string][]; submit: string; onSubmit: (v: Record<string, string>) => Promise<void>; onCancel: () => void }) {
  const [v, setV] = useState<Record<string, string>>(() => Object.fromEntries(fields.map(([k]) => [k, ""])));
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-3">
      {fields.map(([k, label], i) => <Field key={k} label={label}><input className="input" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} autoFocus={i === 0} /></Field>)}
      <div className="flex gap-2 pt-2"><Btn solid disabled={fields.some(([k]) => !v[k]) || busy} onClick={async () => { setBusy(true); try { await onSubmit(v); } finally { setBusy(false); } }}>{submit}</Btn><Btn tone="neutral" onClick={onCancel} className="ml-auto">Cancel</Btn></div>
    </div>
  );
}

/* --------------------------------------------------------------------- rules */

function Rules({ cats, paths, editable, ok, fail }: { cats: AdminCategory[]; paths: { id: string; name: string }[]; editable: boolean; ok: (m: string) => void; fail: (e: unknown) => void }) {
  const { token } = useAuth();
  const { data, loading, error, reload } = useLoad(() => adminApi<AdminRule[]>("/onboarding/rules", token), [token]);
  const [edit, setEdit] = useState<AdminRule | "new" | null>(null);
  const questions = cats.flatMap((c) => c.questions);
  const pathName = (id: string) => paths.find((p) => p.id === id)?.name ?? id;
  const run = (label: string, fn: () => Promise<unknown>) => fn().then(() => { ok(label); reload(); setEdit(null); }).catch(fail);
  return (
    <Card pad={false}>
      <div className="flex items-center px-5 pt-5 pb-3"><p className="text-sm text-muted">Rules run after answer weights, highest priority first. Only published rules apply.</p>{editable && <Btn solid size="sm" className="ml-auto" onClick={() => setEdit("new")}><Icon name="plus" className="w-3.5 h-3.5" /> New rule</Btn>}</div>
      <DataState loading={loading && !data} error={error} onRetry={reload} empty={data?.length === 0} emptyLabel="No rule yet.">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-[11px] uppercase tracking-wide text-faint border-t border-line"><th className="px-5 py-2 font-semibold">When</th><th className="px-3 py-2 font-semibold">Effect</th><th className="px-3 py-2 font-semibold">Path</th><th className="px-3 py-2 font-semibold">Priority</th><th className="px-5 py-2 font-semibold">Status</th></tr></thead>
          <tbody>
            {data?.sort((a, b) => b.priority - a.priority).map((r) => (
              <tr key={r.id} onClick={() => setEdit(r)} className="border-t border-line hover:bg-sunken/60 cursor-pointer">
                <td className="px-5 py-3"><code className="text-xs font-mono">{r.questionKey}</code> <span className="text-muted">{r.operator.replace("_", " ").toLowerCase()}</span> <b>{r.value}</b></td>
                <td className="px-3 py-3"><Badge tone={r.effect === "BOOST_PATH" ? "success" : r.effect === "EXCLUDE_PATH" ? "warning" : "danger"}>{r.effect.replace("_PATH", "").toLowerCase()}{r.effect === "BOOST_PATH" ? ` +${r.points}` : ""}</Badge>{r.reason && <p className="text-xs text-muted mt-0.5">{r.reason}</p>}</td>
                <td className="px-3 py-3 text-fg">{pathName(r.pathId)}</td>
                <td className="px-3 py-3 tabular-nums">{r.priority}</td>
                <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataState>
      {edit && <RuleDrawer rule={edit === "new" ? null : edit} questions={questions} paths={paths} editable={editable} onClose={() => setEdit(null)} run={run} />}
    </Card>
  );
}

function RuleDrawer({ rule, questions, paths, editable, onClose, run }: { rule: AdminRule | null; questions: AdminQuestion[]; paths: { id: string; name: string }[]; editable: boolean; onClose: () => void; run: (l: string, fn: () => Promise<unknown>) => Promise<void> }) {
  const { token } = useAuth();
  const [v, setV] = useState({ questionKey: rule?.questionKey ?? questions[0]?.key ?? "", operator: rule?.operator ?? ("EQUALS" as RuleOperator), value: rule?.value ?? "", effect: rule?.effect ?? ("BOOST_PATH" as RuleEffect), pathId: rule?.pathId ?? paths[0]?.id ?? "", points: rule?.points ?? 2, reason: rule?.reason ?? "", priority: rule?.priority ?? 0 });
  const q = questions.find((x) => x.key === v.questionKey);
  const body = { ...v, reason: nz(v.reason) };
  return (
    <Drawer open onClose={onClose} title={rule ? "Edit rule" : "New rule"} width="max-w-xl" footer={editable && (
      <>
        <Btn solid disabled={!v.questionKey || !v.value || !v.pathId || (v.effect === "BLOCK_PATH" && !v.reason)} onClick={() => run(rule ? "Rule saved" : "Rule created as draft", () => rule ? adminApi(`/onboarding/rules/${rule.id}`, token, { method: "PUT", body }) : adminApi("/onboarding/rules", token, { method: "POST", body }))}>{rule ? "Save" : "Create draft"}</Btn>
        {rule && <div className="ml-auto flex gap-2"><LifecycleButtons status={rule.status} onPublish={() => run("Rule published", () => adminApi(`/onboarding/rules/${rule.id}/publish`, token, { method: "POST" }))} onArchive={() => run("Rule archived", () => adminApi(`/onboarding/rules/${rule.id}/archive`, token, { method: "POST" }))} /></div>}
      </>
    )}>
      <div className="space-y-4">
        <Field label="Question"><select className="input" value={v.questionKey} disabled={!editable} onChange={(e) => setV({ ...v, questionKey: e.target.value, value: "" })}>{questions.map((x) => <option key={x.id} value={x.key}>{x.key} · {x.prompt}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Operator"><select className="input" value={v.operator} disabled={!editable} onChange={(e) => setV({ ...v, operator: e.target.value as RuleOperator })}>{RULE_OPERATORS.map((o) => <option key={o} value={o}>{o.replace("_", " ").toLowerCase()}</option>)}</select></Field>
          <Field label="Value">{q?.options.length ? <select className="input" value={v.value} disabled={!editable} onChange={(e) => setV({ ...v, value: e.target.value })}><option value="">—</option>{q.options.map((o) => <option key={o.id} value={o.value}>{o.label}</option>)}</select> : <input className="input" value={v.value} disabled={!editable} onChange={(e) => setV({ ...v, value: e.target.value })} />}</Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Effect"><select className="input" value={v.effect} disabled={!editable} onChange={(e) => setV({ ...v, effect: e.target.value as RuleEffect })}>{RULE_EFFECTS.map((o) => <option key={o} value={o}>{o === "BOOST_PATH" ? "Boost path (+points)" : o === "EXCLUDE_PATH" ? "Exclude path (hidden)" : "Block path (shown with reason)"}</option>)}</select></Field>
          <Field label="Path"><select className="input" value={v.pathId} disabled={!editable} onChange={(e) => setV({ ...v, pathId: e.target.value })}>{paths.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {v.effect === "BOOST_PATH" && <Field label="Points"><input className="input" type="number" value={v.points} disabled={!editable} onChange={(e) => setV({ ...v, points: Number(e.target.value) })} /></Field>}
          <Field label="Priority" hint="Higher runs first and is the one reported."><input className="input" type="number" value={v.priority} disabled={!editable} onChange={(e) => setV({ ...v, priority: Number(e.target.value) })} /></Field>
        </div>
        <Field label="Reason shown to the user" hint={v.effect === "BLOCK_PATH" ? "Required for Block." : "Optional."}><textarea className="input min-h-[70px]" value={v.reason} disabled={!editable} onChange={(e) => setV({ ...v, reason: e.target.value })} /></Field>
      </div>
    </Drawer>
  );
}

/* ------------------------------------------------------------------- preview */

function Preview({ cats }: { cats: AdminCategory[] }) {
  const { token } = useAuth();
  const questions = useMemo(() => cats.flatMap((c) => c.questions).filter((q) => q.status === "PUBLISHED"), [cats]);
  const [answers, setAnswers] = useState<Record<string, string[] | number | string>>({});
  const [result, setResult] = useState<PreviewRecommendation | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true); setErr("");
    try {
      const body = { answers: Object.entries(answers).filter(([, v]) => (Array.isArray(v) ? v.length : v !== "")).map(([questionKey, v]) => (Array.isArray(v) ? { questionKey, options: v } : typeof v === "number" ? { questionKey, number: v } : { questionKey, text: v })) };
      setResult(await adminApi<PreviewRecommendation>("/onboarding/preview", token, { method: "POST", body }));
    } catch (e) { setErr(e instanceof Error ? e.message : "Preview failed"); } finally { setBusy(false); }
  };
  return (
    <div className="grid lg:grid-cols-2 gap-4 items-start">
      <Card title="Answer as a user" subtitle="Only published questions. Leave blank to skip.">
        <div className="space-y-3">
          {questions.map((q) => (
            <Field key={q.id} label={q.prompt}>
              {q.type === "MULTIPLE_CHOICE" ? <div className="flex flex-wrap gap-1.5">{q.options.map((o) => { const cur = (answers[q.key] as string[] | undefined) ?? []; const on = cur.includes(o.value); return <button key={o.id} onClick={() => setAnswers({ ...answers, [q.key]: on ? cur.filter((x) => x !== o.value) : [...cur, o.value] })} className={`px-2.5 py-1 rounded-lg text-xs border cursor-pointer ${on ? "bg-primary text-white border-primary" : "border-line text-muted"}`}>{o.label}</button>; })}</div>
                : q.type === "SINGLE_CHOICE" ? <select className="input" value={((answers[q.key] as string[] | undefined) ?? [])[0] ?? ""} onChange={(e) => setAnswers({ ...answers, [q.key]: e.target.value ? [e.target.value] : [] })}><option value="">—</option>{q.options.map((o) => <option key={o.id} value={o.value}>{o.label}</option>)}</select>
                : q.type === "TEXT" ? <input className="input" value={(answers[q.key] as string) ?? ""} onChange={(e) => setAnswers({ ...answers, [q.key]: e.target.value })} />
                : <input className="input" type="number" value={(answers[q.key] as number | undefined) ?? ""} onChange={(e) => setAnswers({ ...answers, [q.key]: e.target.value === "" ? "" : Number(e.target.value) })} />}
            </Field>
          ))}
          <Btn solid disabled={busy} onClick={run}>{busy ? "Computing…" : "Compute recommendation"}</Btn>
          {err && <Notice kind="danger">{err}</Notice>}
        </div>
      </Card>
      <Card title="Result" subtitle={result ? `algorithm v${result.algorithmVersion}` : "Run the preview to see scores and why."}>
        {result && (
          <div className="space-y-3">
            {result.recommended && <div className="rounded-xl bg-success/10 border border-success/30 p-3 text-sm"><b>Recommended:</b> {result.recommended.name} · {result.recommended.score} pts</div>}
            {result.ranked.map((r) => (
              <div key={r.pathId} className="rounded-xl border border-line p-3">
                <div className="flex items-center gap-2"><p className="font-semibold text-fg">{r.name}</p><Badge tone="primary">{r.score} pts</Badge></div>
                <ul className="mt-2 text-xs text-muted space-y-0.5">{r.contributions.map((c, i) => <li key={i}>{c.source === "RULE" ? "rule" : c.questionKey} {c.optionLabel ? `· ${c.optionLabel}` : ""} <b className="text-fg">+{c.points}</b></li>)}</ul>
              </div>
            ))}
            {[...result.excluded.map((x) => ({ ...x, kind: "excluded" })), ...result.blocked.map((x) => ({ ...x, kind: "blocked" }))].map((x) => <div key={x.pathId + x.kind} className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm"><Badge tone="danger">{x.kind}</Badge> <b>{x.name}</b> by <code className="text-xs">{x.questionKey}</code>{x.reason && <p className="text-xs text-muted mt-1">{x.reason}</p>}</div>)}
          </div>
        )}
      </Card>
    </div>
  );
}
