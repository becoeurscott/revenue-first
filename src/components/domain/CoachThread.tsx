import { useEffect, useMemo, useRef, useState } from 'react'
import { ChatBubble, ErrorBubble, TypingIndicator } from '@/components/domain/ChatBubble'
import { CoachComposer } from '@/components/domain/CoachComposer'
import { coachReplies, fallbackReply } from '@/data/coach'
import type { CoachConversation, CoachReply, PathId } from '@/data/types'
import { formatDate } from '@/lib/date'
import { useApp } from '@/store/useApp'

/** First canned reply (in order) with any keyword contained in the message. */
export function matchReply(text: string): CoachReply {
  const lower = text.toLowerCase()
  return coachReplies.find((r) => r.keywords.some((k) => lower.includes(k))) ?? fallbackReply
}

const replyText = (reply: CoachReply, pathId: PathId): string => reply.text[pathId] ?? reply.text.all ?? fallbackReply.text.all ?? ''

/**
 * The message list + composer for one conversation. The pending reply is derived
 * from state (last message is from the user) so it survives route remounts.
 */
export function CoachThread({ conversation }: { conversation: CoachConversation }) {
  const pathId = useApp((s) => s.pathId)
  const addChatMessage = useApp((s) => s.addChatMessage)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const bottom = useRef<HTMLDivElement>(null)

  const { id, messages } = conversation
  const last = messages[messages.length - 1]
  const awaiting = last?.from === 'user'
  const typing = awaiting && !failed

  useEffect(() => {
    if (!awaiting) return
    setFailed(false)
    const delay = 600 + Math.random() * 400
    const timer = window.setTimeout(() => {
      if (useApp.getState().settings.offline) setFailed(true)
      else addChatMessage(id, 'coach', replyText(matchReply(last.text), pathId))
    }, delay)
    return () => window.clearTimeout(timer)
    // `attempt` re-runs the request on Retry.
  }, [awaiting, last?.id, last?.text, attempt, id, pathId, addChatMessage])

  // Keep the newest message in view (after the shell's scroll-to-top on navigation).
  useEffect(() => {
    const timer = window.setTimeout(() => bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 80)
    return () => window.clearTimeout(timer)
  }, [messages.length, typing, failed])

  const followUps = useMemo(() => {
    if (!last || last.from !== 'coach') return []
    const prevUser = [...messages].reverse().find((m) => m.from === 'user')
    return prevUser ? matchReply(prevUser.text).followUps : fallbackReply.followUps
  }, [messages, last])

  const send = (text: string) => addChatMessage(id, 'user', text)

  return (
    <div className="pb-24 lg:pb-28">
      <p className="mb-4 text-center text-xs text-faint">{formatDate(conversation.date)}</p>
      <div className="space-y-4" role="log" aria-live="polite" aria-label="Conversation with your coach">
        {messages.map((m) => (
          <ChatBubble key={m.id} from={m.from} text={m.text} date={m.date} />
        ))}
        {typing && <TypingIndicator />}
        {awaiting && failed && <ErrorBubble onRetry={() => setAttempt((n) => n + 1)} />}
      </div>

      {followUps.length > 0 && (
        <div className="mt-5 animate-fade-up pl-10">
          <p className="mb-2 text-xs font-semibold tracking-wider text-faint uppercase">Suggested replies</p>
          <div className="flex flex-wrap gap-2">
            {followUps.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => send(f)}
                className="min-h-11 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-2 text-left text-[13px] font-semibold text-brand-300 transition-all duration-200 hover:border-brand-500/50 hover:bg-brand-500/15 active:scale-95"
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      )}
      <div ref={bottom} className="h-px scroll-mb-40" aria-hidden />
      <CoachComposer onSend={send} disabled={typing} placeholder={awaiting && !failed ? 'Coach is typing…' : 'Reply to your coach…'} />
    </div>
  )
}
