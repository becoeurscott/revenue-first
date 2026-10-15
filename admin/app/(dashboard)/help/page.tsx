"use client";

import { ContentDocPage, ListEditor, StringListEditor, Section } from "@/components/doc";

type Help = { faqs: { q: string; a: string }[]; topics: { id: string; icon: string; title: string; description: string }[]; problemCategories: string[] };

export default function HelpPage() {
  return (
    <ContentDocPage<Help> docKey="help" title="Help & FAQ" subtitle="The Help screen in the app: FAQs, help topics and the categories of the “report a problem” form." tabs={[{ id: "faqs", label: "FAQs" }, { id: "topics", label: "Topics" }, { id: "problems", label: "Problem categories" }]} render={(v, set, tab, editable) => (
      <>
        {tab === "faqs" && <Section title="Frequently asked questions"><ListEditor items={v.faqs} onChange={(faqs) => set({ ...v, faqs })} editable={editable} labelOf={(f) => f.q} blank={() => ({ q: "", a: "" })} fields={[{ key: "q", label: "Question", width: "sm:col-span-2" }, { key: "a", label: "Answer", kind: "textarea" }]} /></Section>}
        {tab === "topics" && <Section title="Help topics" hint="Cards on the Help screen."><ListEditor items={v.topics} onChange={(topics) => set({ ...v, topics })} editable={editable} labelOf={(t) => t.title} blank={() => ({ id: `topic-${Date.now()}`, icon: "questionmark.circle", title: "", description: "" })} fields={[{ key: "id", label: "Id" }, { key: "icon", label: "SF Symbol" }, { key: "title", label: "Title" }, { key: "description", label: "Description", kind: "textarea" }]} /></Section>}
        {tab === "problems" && <Section title="Problem categories" hint="Choices in the “report a problem” form."><StringListEditor value={v.problemCategories} onChange={(problemCategories) => set({ ...v, problemCategories })} editable={editable} /></Section>}
      </>
    )} />
  );
}
