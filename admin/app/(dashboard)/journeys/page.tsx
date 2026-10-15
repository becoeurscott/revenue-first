"use client";

import { ContentDocPage, ListEditor, Section, StringListEditor, TagsInput } from "@/components/doc";
import { Badge, Field, Toggle } from "@/components/ui";

type GoalOption = { label: string; metric: string; target: number; money?: boolean | null };
type Journey = { id: string; version: number; status: "active" | "coming_soon"; label: string; shortLabel: string; description: string; icon: string; hue: number; track: string | null; planId: string | null; primaryAction: string; modules: string[]; metrics: string[]; achievementIds: string[]; monetizationStages: string[]; requiresProspects: boolean; requiresDeals: boolean; goalOptions: GoalOption[]; checkinMetrics: string[]; quickActions: string[] };
type MetricDef = { label: string; icon: string; kind: string; format: string; hint: string };
type Stage = { id: string; title: string; summary: string; readyWhen: string[]; actions: string[] };
type ContentStage = { stage: string; label: string; icon: string; nextAction: string };
type Niche = { keywords: string[]; label: string; audience: string; problemOrDesire: string; allowedClaims: string[]; restrictedTopics: string[]; exampleTerms: string[]; monetizationOptions: string[]; cautionNote: string | null };
type JQuestion = { key: string; icon: string; title: string; subtitle: string; kind: string; options: { value: string; label: string; icon: string; hint: string | null }[] | null; placeholder: string | null; required: boolean; mascotLine: string };
type Journeys = { catalogVersion: number; journeys: Journey[]; metrics: Record<string, MetricDef>; monetization: Stage[]; contentStages: ContentStage[]; universalLessonIds: string[]; universalResourceIds: string[]; broadNicheTerms: string[]; niches: Niche[]; onboarding: JQuestion[] };

const METRIC_KINDS = ["count", "sum", "latest", "derived"], FORMATS = ["number", "money", "percent", "minutes"];

export default function JourneysPage() {
  return (
    <ContentDocPage<Journeys> docKey="journeys" title="Journeys" subtitle="How the app adapts to each user's earning method, niche and starting stage." tabs={[{ id: "journeys", label: "Earning methods" }, { id: "questions", label: "Journey questions" }, { id: "niches", label: "Niche catalog" }, { id: "metrics", label: "Metrics" }, { id: "monetization", label: "Monetization stages" }, { id: "content", label: "Content stages" }, { id: "universal", label: "Universal content" }]} render={(v, set, tab, editable) => (
      <>
        {tab === "journeys" && (
          <div className="space-y-4">
            {v.journeys.map((j, i) => {
              const up = (patch: Partial<Journey>) => set({ ...v, journeys: v.journeys.map((x, k) => (k === i ? { ...x, ...patch } : x)) });
              return (
                <Section key={j.id} title={`${j.label}`} hint={`${j.id} · v${j.version}`}>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <Field label="Status"><div className="flex items-center gap-3 h-[42px]"><Toggle checked={j.status === "active"} disabled={!editable} onChange={(on) => up({ status: on ? "active" : "coming_soon" })} label="Active" /><Badge tone={j.status === "active" ? "success" : "warning"}>{j.status === "active" ? "active" : "coming soon"}</Badge></div></Field>
                    <Field label="Label"><input className="input" value={j.label} disabled={!editable} onChange={(e) => up({ label: e.target.value })} /></Field>
                    <Field label="Short label"><input className="input" value={j.shortLabel} disabled={!editable} onChange={(e) => up({ shortLabel: e.target.value })} /></Field>
                    <Field label="Description" className="sm:col-span-2 lg:col-span-3"><textarea className="input min-h-[60px]" value={j.description} disabled={!editable} onChange={(e) => up({ description: e.target.value })} /></Field>
                    <Field label="SF Symbol"><input className="input" value={j.icon} disabled={!editable} onChange={(e) => up({ icon: e.target.value })} /></Field>
                    <Field label="Hue (0–360)"><input className="input" type="number" value={j.hue} disabled={!editable} onChange={(e) => up({ hue: Number(e.target.value) })} /></Field>
                    <Field label="Content track (path slug)" hint="Empty while coming soon"><input className="input" value={j.track ?? ""} disabled={!editable} onChange={(e) => up({ track: e.target.value || null })} /></Field>
                    <Field label="Plan id"><input className="input" value={j.planId ?? ""} disabled={!editable} onChange={(e) => up({ planId: e.target.value || null })} /></Field>
                    <Field label="Primary action"><input className="input" value={j.primaryAction} disabled={!editable} onChange={(e) => up({ primaryAction: e.target.value })} /></Field>
                    <Field label="Needs prospects (CRM)"><div className="h-[42px] flex items-center"><Toggle checked={j.requiresProspects} disabled={!editable} onChange={(b) => up({ requiresProspects: b })} /></div></Field>
                    <Field label="Needs deals"><div className="h-[42px] flex items-center"><Toggle checked={j.requiresDeals} disabled={!editable} onChange={(b) => up({ requiresDeals: b })} /></div></Field>
                    <Field label="Modules" className="sm:col-span-2 lg:col-span-3"><TagsInput value={j.modules} editable={editable} onChange={(modules) => up({ modules })} /></Field>
                    <Field label="Metrics" hint="Keys from the Metrics tab"><TagsInput value={j.metrics} editable={editable} onChange={(metrics) => up({ metrics })} /></Field>
                    <Field label="Check-in metrics"><TagsInput value={j.checkinMetrics} editable={editable} onChange={(checkinMetrics) => up({ checkinMetrics })} /></Field>
                    <Field label="Achievement ids"><TagsInput value={j.achievementIds} editable={editable} onChange={(achievementIds) => up({ achievementIds })} /></Field>
                    <Field label="Monetization stages"><TagsInput value={j.monetizationStages} editable={editable} onChange={(monetizationStages) => up({ monetizationStages })} /></Field>
                    <Field label="Quick actions" className="sm:col-span-2"><TagsInput value={j.quickActions} editable={editable} onChange={(quickActions) => up({ quickActions })} /></Field>
                    <div className="sm:col-span-2 lg:col-span-3"><ListEditor title="Goal options" items={j.goalOptions} editable={editable} labelOf={(g) => `${g.label} · ${g.metric} ≥ ${g.target}`} blank={() => ({ label: "", metric: "revenue", target: 100, money: true })} onChange={(goalOptions) => up({ goalOptions })} fields={[{ key: "label", label: "Label" }, { key: "metric", label: "Metric" }, { key: "target", label: "Target", kind: "number" }, { key: "money", label: "Money", kind: "boolean" }]} /></div>
                  </div>
                </Section>
              );
            })}
          </div>
        )}
        {tab === "questions" && (
          <Section title="Journey setup questions" hint="Asked when a user starts a journey. Keys are read by the app logic (earningMethod, niche, startingStage…): rename with care.">
            <ListEditor items={v.onboarding} editable={editable} labelOf={(q) => `${q.key} · ${q.title}`} blank={() => ({ key: "", icon: "questionmark", title: "", subtitle: "", kind: "single", options: [], placeholder: null, required: true, mascotLine: "" })} onChange={(onboarding) => set({ ...v, onboarding })} fields={[{ key: "key", label: "Key" }, { key: "kind", label: "Kind", kind: "select", options: ["text", "single", "multi", "goal"] }, { key: "title", label: "Title" }, { key: "icon", label: "SF Symbol" }, { key: "subtitle", label: "Subtitle", kind: "textarea" }, { key: "placeholder", label: "Placeholder (text kind)" }, { key: "required", label: "Required", kind: "boolean" }, { key: "mascotLine", label: "Mascot line", kind: "textarea" }]} />
            <p className="text-xs text-muted mt-3">Answer options are edited in the JSON tab (value, label, icon, hint per option).</p>
          </Section>
        )}
        {tab === "niches" && (
          <Section title="Niche catalog" hint="Known niches get a curated context; unknown ones are normalized by the AI using broad terms as a fallback.">
            <Field label="Broad niche terms (ask one follow-up question when the niche is one of these)" className="mb-4"><TagsInput value={v.broadNicheTerms} editable={editable} onChange={(broadNicheTerms) => set({ ...v, broadNicheTerms })} /></Field>
            <ListEditor items={v.niches} editable={editable} labelOf={(n) => n.label} blank={() => ({ keywords: [], label: "", audience: "", problemOrDesire: "", allowedClaims: [], restrictedTopics: [], exampleTerms: [], monetizationOptions: [], cautionNote: null })} onChange={(niches) => set({ ...v, niches })} fields={[{ key: "label", label: "Label" }, { key: "audience", label: "Audience" }, { key: "keywords", label: "Keywords (match user input)", kind: "tags" }, { key: "problemOrDesire", label: "Problem or desire", kind: "textarea" }, { key: "exampleTerms", label: "Example terms", kind: "tags" }, { key: "monetizationOptions", label: "Monetization options", kind: "tags" }, { key: "allowedClaims", label: "Allowed claims", kind: "tags" }, { key: "restrictedTopics", label: "Restricted topics", kind: "tags" }, { key: "cautionNote", label: "Caution note (health, finance, legal…)", kind: "textarea" }]} />
          </Section>
        )}
        {tab === "metrics" && (
          <Section title="Metric definitions" hint="Keyed by metric id; journeys, goals and achievements reference these keys.">
            <div className="space-y-2">
              {Object.entries(v.metrics).map(([k, m]) => (
                <div key={k} className="rounded-xl border border-line p-3 grid sm:grid-cols-[120px_1fr_1fr_110px_110px_1fr] gap-2 items-end">
                  <Badge tone="primary">{k}</Badge>
                  <Field label="Label"><input className="input" value={m.label} disabled={!editable} onChange={(e) => set({ ...v, metrics: { ...v.metrics, [k]: { ...m, label: e.target.value } } })} /></Field>
                  <Field label="SF Symbol"><input className="input" value={m.icon} disabled={!editable} onChange={(e) => set({ ...v, metrics: { ...v.metrics, [k]: { ...m, icon: e.target.value } } })} /></Field>
                  <Field label="Kind"><select className="input" value={m.kind} disabled={!editable} onChange={(e) => set({ ...v, metrics: { ...v.metrics, [k]: { ...m, kind: e.target.value } } })}>{METRIC_KINDS.map((x) => <option key={x}>{x}</option>)}</select></Field>
                  <Field label="Format"><select className="input" value={m.format} disabled={!editable} onChange={(e) => set({ ...v, metrics: { ...v.metrics, [k]: { ...m, format: e.target.value } } })}>{FORMATS.map((x) => <option key={x}>{x}</option>)}</select></Field>
                  <Field label="Hint"><input className="input" value={m.hint} disabled={!editable} onChange={(e) => set({ ...v, metrics: { ...v.metrics, [k]: { ...m, hint: e.target.value } } })} /></Field>
                </div>
              ))}
            </div>
          </Section>
        )}
        {tab === "monetization" && <Section title="Monetization stages"><ListEditor items={v.monetization} editable={editable} labelOf={(s) => `${s.id} · ${s.title}`} blank={() => ({ id: "", title: "", summary: "", readyWhen: [], actions: [] })} onChange={(monetization) => set({ ...v, monetization })} fields={[{ key: "id", label: "Id" }, { key: "title", label: "Title" }, { key: "summary", label: "Summary", kind: "textarea" }, { key: "readyWhen", label: "Ready when", kind: "tags" }, { key: "actions", label: "Actions", kind: "tags" }]} /></Section>}
        {tab === "content" && <Section title="Content pipeline stages" hint="idea → researched → scripted → recorded → edited → published"><ListEditor items={v.contentStages} editable={editable} labelOf={(s) => `${s.stage} · ${s.label}`} blank={() => ({ stage: "", label: "", icon: "circle", nextAction: "" })} onChange={(contentStages) => set({ ...v, contentStages })} fields={[{ key: "stage", label: "Stage id" }, { key: "label", label: "Label" }, { key: "icon", label: "SF Symbol" }, { key: "nextAction", label: "Next action" }]} /></Section>}
        {tab === "universal" && (
          <div className="grid lg:grid-cols-2 gap-4">
            <Section title="Universal lesson ids" hint="Shown to every journey regardless of track."><StringListEditor value={v.universalLessonIds} editable={editable} onChange={(universalLessonIds) => set({ ...v, universalLessonIds })} /></Section>
            <Section title="Universal resource ids"><StringListEditor value={v.universalResourceIds} editable={editable} onChange={(universalResourceIds) => set({ ...v, universalResourceIds })} /></Section>
          </div>
        )}
      </>
    )} />
  );
}
