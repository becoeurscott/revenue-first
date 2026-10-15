"use client";

import { ContentDocPage, ListEditor, Section } from "@/components/doc";

type Sub = { plans: { id: string; name: string; price: string; period: string; note: string; badge: string | null }[]; benefits: { icon: string; title: string; description: string }[] };

export default function SubscriptionPage() {
  return (
    <ContentDocPage<Sub> docKey="subscription" title="Subscription" subtitle="Paywall copy: plan cards and the benefit list. Prices themselves come from the App Store via RevenueCat; this is what the app displays." tabs={[{ id: "plans", label: "Plans" }, { id: "benefits", label: "Benefits" }]} render={(v, set, tab, editable) => (
      <>
        {tab === "plans" && <Section title="Plans" hint="Ids must match the RevenueCat package identifiers (monthly / yearly)."><ListEditor items={v.plans} onChange={(plans) => set({ ...v, plans })} editable={editable} labelOf={(p) => `${p.name} · ${p.price} ${p.period}`} blank={() => ({ id: "", name: "", price: "", period: "/ month", note: "", badge: null })} fields={[{ key: "id", label: "Id (RevenueCat package)" }, { key: "name", label: "Name" }, { key: "price", label: "Display price", hint: "Fallback when the store price is unavailable" }, { key: "period", label: "Period" }, { key: "note", label: "Note", kind: "textarea" }, { key: "badge", label: "Badge", hint: "e.g. Best value — empty for none" }]} /></Section>}
        {tab === "benefits" && <Section title="Benefits"><ListEditor items={v.benefits} onChange={(benefits) => set({ ...v, benefits })} editable={editable} labelOf={(b) => b.title} blank={() => ({ icon: "checkmark.seal", title: "", description: "" })} fields={[{ key: "icon", label: "SF Symbol" }, { key: "title", label: "Title" }, { key: "description", label: "Description", kind: "textarea" }]} /></Section>}
      </>
    )} />
  );
}
