import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ChevronRight, Mail, MessageCircle } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { FaqAccordion } from '@/components/domain/FaqAccordion'
import { ContactForm, ReportForm } from '@/components/domain/HelpForms'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Chips'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchBar } from '@/components/ui/Inputs'
import { Sheet } from '@/components/ui/Sheet'
import { faqs, helpTopics } from '@/data/help'
import type { FaqItem } from '@/data/types'

const TABS = ['Help Center', 'FAQ', 'Contact', 'Report'] as const
type Tab = (typeof TABS)[number]
type Topic = (typeof helpTopics)[number]

/** Which FAQ entries belong to each help topic (matched against question + answer). */
const TOPIC_KEYWORDS: Record<string, string[]> = {
  'getting-started': ['path get selected', 'change paths', 'spend money'],
  program: ['30-day program', 'streak', 'day 30'],
  coach: ['coach'],
  prospects: ['outreach', 'guarantee'],
  revenue: ['billing', 'guarantee', 'spend money'],
  billing: ['billing', 'data real', 'change paths'],
}

const matches = (f: FaqItem, q: string) => `${f.q} ${f.a}`.toLowerCase().includes(q)
const faqsForTopic = (t: Topic) => faqs.filter((f) => (TOPIC_KEYWORDS[t.id] ?? [t.title.toLowerCase()]).some((k) => matches(f, k)))

export default function Help() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('Help Center')
  const [query, setQuery] = useState('')
  const [topic, setTopic] = useState<Topic | null>(null)
  const [openFaq, setOpenFaq] = useState<string | null>(null)

  const q = query.trim().toLowerCase()
  const topicResults = useMemo(() => helpTopics.filter((t) => !q || `${t.title} ${t.description}`.toLowerCase().includes(q)), [q])
  const faqResults = useMemo(() => faqs.filter((f) => !q || matches(f, q)), [q])

  const showFaq = (question: string) => {
    setTopic(null)
    setQuery('')
    setOpenFaq(question)
    setTab('FAQ')
  }
  const changeTab = (t: Tab) => {
    setTab(t)
    setOpenFaq(null)
  }

  const noResults = (
    <EmptyState
      mood="thinking"
      title="No answers found"
      description={`Nothing matches "${query.trim()}". Try another word, or send us a message.`}
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="secondary" onClick={() => setQuery('')}>Clear search</Button>
          <Button onClick={() => changeTab('Contact')}>Contact support</Button>
        </div>
      }
    />
  )

  return (
    <Page title="Help" back>
      <Tabs options={TABS} value={tab} onChange={changeTab} label="Help sections" />

      <div className="mt-5 pb-8" role="tabpanel" aria-label={tab}>
        {tab === 'Help Center' && (
          <div className="animate-fade-in space-y-6">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">How can we help?</h2>
              <p className="mt-1 mb-3 text-[15px] text-muted">Search topics and common questions.</p>
              <SearchBar value={query} onChange={setQuery} placeholder="Search help" />
            </div>

            {q && topicResults.length === 0 && faqResults.length === 0 ? (
              noResults
            ) : (
              <>
                {topicResults.length > 0 && (
                  <section>
                    <h3 className="mb-3 text-[17px] font-bold tracking-tight">Topics</h3>
                    <div className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {topicResults.map((t) => (
                        <button key={t.id} type="button" onClick={() => setTopic(t)} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4 text-left transition-all duration-200 hover:border-line-strong hover:bg-surface-2 active:scale-[0.99]">
                          <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-surface-3 text-xl" aria-hidden>{t.emoji}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[15px] font-semibold">{t.title}</span>
                            <span className="block text-[13px] leading-snug text-muted">{t.description}</span>
                          </span>
                          <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden />
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {q && faqResults.length > 0 && (
                  <section>
                    <h3 className="mb-3 text-[17px] font-bold tracking-tight">Questions <span className="tabular text-[13px] font-medium text-faint">{faqResults.length}</span></h3>
                    <FaqAccordion items={faqResults} />
                  </section>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <Card variant="hero" className="flex items-center gap-4">
                    <span className="bg-brand-gradient flex size-12 shrink-0 items-center justify-center rounded-full shadow-glow-sm"><MessageCircle className="size-5.5 text-white" aria-hidden /></span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[15px] font-bold">Ask your coach</h3>
                      <p className="text-[13px] text-muted">Pricing, outreach, what to do next — answered in seconds.</p>
                    </div>
                    <Button size="sm" onClick={() => navigate('/coach')} iconRight={<ArrowRight className="size-3.5" aria-hidden />}>Ask</Button>
                  </Card>
                  <Card className="flex items-center gap-4">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-3 text-brand-300"><Mail className="size-5.5" aria-hidden /></span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[15px] font-bold">Still stuck?</h3>
                      <p className="text-[13px] text-muted">Message support. We reply within 24 hours.</p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => changeTab('Contact')}>Contact</Button>
                  </Card>
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'FAQ' && (
          <div className="animate-fade-in space-y-4">
            <SearchBar value={query} onChange={setQuery} placeholder="Search questions" />
            {faqResults.length === 0 ? noResults : <FaqAccordion items={faqResults} initialOpen={openFaq} />}
          </div>
        )}

        {tab === 'Contact' && (
          <div className="mx-auto max-w-xl animate-fade-in">
            <h2 className="text-xl font-bold tracking-tight">Contact support</h2>
            <p className="mt-1 mb-5 text-sm text-muted">A real person reads every message.</p>
            <ContactForm />
          </div>
        )}

        {tab === 'Report' && (
          <div className="mx-auto max-w-xl animate-fade-in">
            <h2 className="text-xl font-bold tracking-tight">Report a problem</h2>
            <p className="mt-1 mb-5 text-sm text-muted">Found a bug or something that looks wrong? Tell us and we'll fix it.</p>
            <ReportForm />
          </div>
        )}
      </div>

      <Sheet
        open={!!topic}
        onClose={() => setTopic(null)}
        title={topic ? `${topic.emoji} ${topic.title}` : 'Topic'}
        description={topic?.description}
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" full onClick={() => { setTopic(null); changeTab('Contact') }}>Contact support</Button>
            <Button full onClick={() => navigate('/coach')}>Ask your coach</Button>
          </div>
        }
      >
        {topic && (
          <div className="pb-1">
            <p className="mb-2 text-xs font-semibold tracking-wider text-faint uppercase">Common questions</p>
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
              {faqsForTopic(topic).map((f) => (
                <li key={f.q}>
                  <button type="button" onClick={() => showFaq(f.q)} className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-2">
                    <span className="flex-1 text-[15px] leading-snug font-medium">{f.q}</span>
                    <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Sheet>
    </Page>
  )
}
