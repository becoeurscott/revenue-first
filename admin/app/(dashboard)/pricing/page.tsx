"use client";

import { useState } from "react";
import { ContentDocPage, ListEditor, MapOfListsEditor, Section, StringListEditor } from "@/components/doc";
import { Field, Segmented } from "@/components/ui";

type Mult = { label: string; mult: number };
type Pricing = { options: Record<string, { services: { label: string; base: number }[]; scopes: Mult[] }>; experienceLevels: Mult[]; clientSizes: Mult[]; turnarounds: Mult[]; disclaimer: string };
type Generator = { services: Record<string, string[]>; tones: string[]; goals: string[] };

export default function PricingPage() {
  const [doc, setDoc] = useState<"pricing" | "generator-options">("pricing");
  return (
    <>
      <div className="mb-2"><Segmented options={[{ id: "pricing", label: "Pricing calculator" }, { id: "generator-options", label: "Outreach generator" }]} value={doc} onChange={setDoc} /></div>
      {doc === "pricing" ? (
        <ContentDocPage<Pricing> docKey="pricing" title="Pricing calculator" subtitle="Base prices and multipliers behind “Recommend a price” in Outreach. Price = base × scope × experience × client size × turnaround." tabs={[{ id: "services", label: "Services by path" }, { id: "multipliers", label: "Multipliers" }, { id: "copy", label: "Copy" }]} render={(v, set, tab, editable) => (
          <>
            {tab === "services" && Object.entries(v.options).map(([path, o]) => (
              <Section key={path} title={`Path: ${path}`}>
                <div className="grid lg:grid-cols-2 gap-4">
                  <ListEditor title="Services" items={o.services} editable={editable} labelOf={(s) => `${s.label} · $${s.base}`} blank={() => ({ label: "", base: 100 })} onChange={(services) => set({ ...v, options: { ...v.options, [path]: { ...o, services } } })} fields={[{ key: "label", label: "Service" }, { key: "base", label: "Base price ($)", kind: "number" }]} />
                  <ListEditor title="Scopes" items={o.scopes} editable={editable} labelOf={(s) => `${s.label} · ×${s.mult}`} blank={() => ({ label: "", mult: 1 })} onChange={(scopes) => set({ ...v, options: { ...v.options, [path]: { ...o, scopes } } })} fields={[{ key: "label", label: "Scope" }, { key: "mult", label: "Multiplier", kind: "number" }]} />
                </div>
              </Section>
            ))}
            {tab === "multipliers" && (
              <div className="grid lg:grid-cols-3 gap-4">
                {(["experienceLevels", "clientSizes", "turnarounds"] as const).map((k) => (
                  <Section key={k} title={{ experienceLevels: "Experience levels", clientSizes: "Client sizes", turnarounds: "Turnarounds" }[k]}>
                    <ListEditor items={v[k]} editable={editable} labelOf={(m) => `${m.label} · ×${m.mult}`} blank={() => ({ label: "", mult: 1 })} onChange={(list) => set({ ...v, [k]: list })} fields={[{ key: "label", label: "Label" }, { key: "mult", label: "Multiplier", kind: "number" }]} />
                  </Section>
                ))}
              </div>
            )}
            {tab === "copy" && <Section title="Disclaimer"><Field label="Shown under every price suggestion"><textarea className="input min-h-[80px]" value={v.disclaimer} disabled={!editable} onChange={(e) => set({ ...v, disclaimer: e.target.value })} /></Field></Section>}
          </>
        )} />
      ) : (
        <ContentDocPage<Generator> docKey="generator-options" title="Outreach generator" subtitle="The choices offered when a user generates an outreach message." tabs={[{ id: "services", label: "Services by path" }, { id: "tones", label: "Tones" }, { id: "goals", label: "Goals" }]} render={(v, set, tab, editable) => (
          <>
            {tab === "services" && <Section title="Services by path" hint="Key = path slug."><MapOfListsEditor value={v.services} onChange={(services) => set({ ...v, services })} editable={editable} keyLabel="Path slug" /></Section>}
            {tab === "tones" && <Section title="Tones"><StringListEditor value={v.tones} onChange={(tones) => set({ ...v, tones })} editable={editable} /></Section>}
            {tab === "goals" && <Section title="Goals"><StringListEditor value={v.goals} onChange={(goals) => set({ ...v, goals })} editable={editable} /></Section>}
          </>
        )} />
      )}
    </>
  );
}
