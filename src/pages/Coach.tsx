import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, Lightbulb, MessageSquare, Trash2 } from 'lucide-react'
import { CoachComposer } from '@/components/domain/CoachComposer'
import { CoachThread } from '@/components/domain/CoachThread'
import { PremiumGate } from '@/components/domain/Paywall'
import { useFakeLoad } from '@/components/domain/useFakeLoad'
import { Page } from '@/components/layout/Page'
import { Mascot } from '@/components/mascot/Mascot'
import { Button, IconButton } from '@/components/ui/Button'
import { Card, SectionHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/Sheet'
import { ListSkeleton } from '@/components/ui/Skeleton'
import { toast } from '@/components/ui/Toast'
import { coachTips, suggestedPrompts } from '@/data/coach'
import { timeAgo } from '@/lib/date'
import { useApp } from '@/store/useApp'

const GATE_COPY = 'Get instant, practical answers about clients, pricing and outreach, tailored to your path.'

function CoachHome() {
  const navigate = useNavigate()
  const pathId = useApp((s) => s.pathId)
  const firstName = useApp((s) => s.user.name.split(' ')[0])
  const conversations = useApp((s) => s.conversations)
  const startConversation = useApp((s) => s.startConversation)
  const addChatMessage = useApp((s) => s.addChatMessage)
  const loading = useFakeLoad(450)

  const tips = coachTips[pathId]
  const tip = tips[new Date().getDate() % tips.length]

  const send = (text: string) => {
    const id = startConversation(text)
    addChatMessage(id, 'user', text)
    navigate(`/coach/conversation/${id}`)
  }

  return (
    <div className="space-y-8 pb-24 lg:pb-28">
      <Card variant="hero" className="overflow-hidden">
        <div className="flex items-center gap-4">
          <Mascot mood="happy" size={84} className="shrink-0" />
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold tracking-tight">Hi{firstName ? ` ${firstName}` : ''}, what are you stuck on?</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">Short answers, exact words, and one next step. Pick a question or type your own.</p>
          </div>
        </div>
        <div className="stagger mt-5 flex flex-wrap gap-2" aria-label="Suggested questions">
          {suggestedPrompts[pathId].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => send(p)}
              className="min-h-11 rounded-full border border-line bg-surface/80 px-4 py-2 text-left text-[13px] font-semibold text-ink-soft transition-all duration-200 hover:border-brand-500/50 hover:bg-brand-500/12 hover:text-brand-300 active:scale-95"
            >
              {p}
            </button>
          ))}
        </div>
      </Card>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
        <section aria-label="Recent conversations" className="lg:order-1">
          <SectionHeader title="Recent conversations" />
          {loading ? (
            <ListSkeleton count={3} />
          ) : conversations.length === 0 ? (
            <EmptyState compact mood="thinking" title="No conversations yet" description="Ask your first question below. Your chats are saved here so you can come back to the advice." />
          ) : (
            <ul className="stagger space-y-3">
              {conversations.map((c) => {
                const lastMessage = c.messages[c.messages.length - 1]
                return (
                  <li key={c.id}>
                    <Link to={`/coach/conversation/${c.id}`} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4 transition-all duration-200 hover:border-line-strong hover:bg-surface-2 active:scale-[0.99]">
                      <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-brand-300">
                        <MessageSquare className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="truncate text-[15px] font-semibold">{c.title}</span>
                          <span className="tabular shrink-0 text-xs text-faint">{timeAgo(c.date)}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-[13px] text-muted">
                          {lastMessage ? `${lastMessage.from === 'user' ? 'You: ' : ''}${lastMessage.text.replace(/\s+/g, ' ')}` : 'No messages yet'}
                        </span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <aside className="lg:order-2">
          <SectionHeader title="Coach tip" />
          <Card className="flex gap-3">
            <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-md bg-warning/12 text-warning">
              <Lightbulb className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[15px] leading-relaxed text-ink-soft">{tip}</p>
              <button type="button" onClick={() => send(`Tell me more about this tip: "${tip}"`)} className="mt-1 -ml-1 inline-flex min-h-11 items-center px-1 text-[13px] font-semibold text-brand-300 hover:text-brand-400">
                Ask the coach about this
              </button>
            </div>
          </Card>
        </aside>
      </div>

      <CoachComposer onSend={send} />
    </div>
  )
}

function ConversationScreen({ id }: { id: string }) {
  const navigate = useNavigate()
  const conversation = useApp((s) => s.conversations.find((c) => c.id === id))
  const deleteConversation = useApp((s) => s.deleteConversation)
  const [confirm, setConfirm] = useState(false)

  if (!conversation) {
    return (
      <Page title="Conversation" back="/coach">
        <EmptyState mood="sad" title="Conversation not found" description="It may have been deleted. Start a new chat and your coach will pick things up from there." action={<Button onClick={() => navigate('/coach')}>Back to coach</Button>} />
      </Page>
    )
  }

  return (
    <Page
      title={conversation.title}
      back="/coach"
      actions={
        <IconButton label="Delete conversation" onClick={() => setConfirm(true)}>
          <Trash2 className="size-4.5" aria-hidden />
        </IconButton>
      }
    >
      <PremiumGate feature="AI Coach" description={GATE_COPY}>
        <CoachThread conversation={conversation} />
      </PremiumGate>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          deleteConversation(conversation.id)
          toast('Conversation deleted')
          navigate('/coach')
        }}
        title="Delete this conversation?"
        description="The messages will be removed from your history. This can't be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </Page>
  )
}

export default function Coach() {
  const { id } = useParams()
  if (id) return <ConversationScreen id={id} />
  return (
    <Page title="Your Business Coach" subtitle="Ask me anything about your path." large>
      <PremiumGate feature="AI Coach" description={GATE_COPY}>
        <CoachHome />
      </PremiumGate>
    </Page>
  )
}
