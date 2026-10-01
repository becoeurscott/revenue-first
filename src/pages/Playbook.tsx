import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { AlertTriangle, Copy, Lightbulb, MapPin, MessageSquareText, RefreshCw, Save, ShieldAlert, Tag, Target, Users } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { MascotLoader } from '@/components/mascot/MascotLoader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, SectionHeader } from '@/components/ui/Card'
import { TextField } from '@/components/ui/Inputs'
import { toast } from '@/components/ui/Toast'
import { AiRequestError, generatePlaybook, type AiError } from '@/lib/ai'
import { useProgram } from '@/store/selectors'
import { useApp } from '@/store/useApp'

const errorCopy: Record<AiError, string> = {
  not_configured: "The AI coach isn't connected yet. Your playbook unlocks as soon as it's switched on.",
  offline: "Couldn't reach the server. Check your connection and try again.",
  busy: 'Lots of people are building playbooks right now. Try again in a minute.',
  failed: 'Something went wrong while building your playbook. Try again.',
}

function NicheForm({ initial, onSave, onCancel }: { initial: string; onSave: (niche: string) => void; onCancel?: () => void }) {
  const [value, setValue] = useState(initial)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (value.trim().length >= 2) onSave(value.trim())
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <TextField label="Your niche" placeholder="e.g. fitness YouTubers, dentists, real estate agents" value={value} onChange={(e) => setValue(e.target.value)} maxLength={80} autoFocus />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" disabled={value.trim().length < 2}>Build My Playbook</Button>
        {onCancel && <Button variant="ghost" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  )
}

export default function Playbook() {
  const playbook = useApp((s) => s.playbook)
  const niche = useApp((s) => s.answers.niche ?? '')
  const setNiche = useApp((s) => s.setNiche)
  const setPlaybook = useApp((s) => s.setPlaybook)
  const saveTemplate = useApp((s) => s.saveTemplate)
  const { progress } = useProgram()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<AiError | null>(null)
  const [editing, setEditing] = useState(false)
  const started = useRef(false)

  const build = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setPlaybook(await generatePlaybook(useApp.getState()))
      toast.success('Your playbook is ready')
    } catch (e) {
      const kind = e instanceof AiRequestError ? e.kind : 'failed'
      setError(kind)
      if (useApp.getState().playbook) toast.error(errorCopy[kind])
    } finally {
      setLoading(false)
    }
  }, [setPlaybook])

  useEffect(() => {
    if (niche.trim() && !playbook && !started.current) {
      started.current = true
      void build()
    }
  }, [niche, playbook, build])

  const changeNiche = (next: string) => {
    setEditing(false)
    started.current = false
    setNiche(next)
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied to clipboard')
    } catch {
      toast.error("Couldn't copy — select the text instead")
    }
  }

  if (!niche.trim() || editing) {
    return (
      <Page back title="Niche Playbook">
        <Card variant="hero" className="max-w-2xl">
          <span className="text-[13px] font-semibold tracking-wider text-brand-300 uppercase">Personalised by AI</span>
          <h2 className="mt-2 text-2xl leading-tight font-extrabold tracking-tight">Which niche do you want to earn in?</h2>
          <p className="mt-2 mb-5 text-sm leading-relaxed text-muted">Your coach builds a playbook for it: what to sell, what to charge, where to find clients, the exact messages to send and a tip for every day of your plan.</p>
          <NicheForm initial={niche} onSave={changeNiche} onCancel={editing ? () => setEditing(false) : undefined} />
        </Card>
      </Page>
    )
  }

  if (loading) {
    return (
      <Page back title="Niche Playbook">
        <MascotLoader full={false} label={`Building your ${niche} playbook… this takes about a minute`} />
      </Page>
    )
  }

  if (!playbook) {
    return (
      <Page back title="Niche Playbook">
        <Card className="max-w-2xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
            <div>
              <h2 className="text-[17px] font-bold">Playbook for {niche}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">{error ? errorCopy[error] : 'Ready when you are.'}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => void build()} icon={<RefreshCw className="size-4" aria-hidden />}>{error ? 'Try Again' : 'Build My Playbook'}</Button>
            <Button variant="ghost" onClick={() => setEditing(true)}>Change Niche</Button>
          </div>
        </Card>
      </Page>
    )
  }

  const tip = playbook.dailyTips[progress.currentDay - 1]

  return (
    <Page
      back
      title={`${playbook.niche} Playbook`}
      actions={<Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Change Niche</Button>}
    >
      <div className="stagger space-y-8">
        <Card variant="hero">
          <Badge tone="brand" icon={<Target className="size-3" aria-hidden />}>{playbook.niche}</Badge>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{playbook.summary}</p>
          <p className="mt-3 text-[13px] text-muted">{playbook.fit}</p>
        </Card>

        {tip && (
          <Card variant="selected" className="flex gap-3">
            <Lightbulb className="mt-0.5 size-5 shrink-0 text-brand-300" aria-hidden />
            <div>
              <p className="text-[13px] font-semibold tracking-wider text-brand-300 uppercase">Today · Day {progress.currentDay}</p>
              <p className="mt-1 text-[15px] leading-relaxed">{tip}</p>
            </div>
          </Card>
        )}

        <section>
          <SectionHeader title="What to Sell" />
          <div className="grid gap-3 lg:grid-cols-3">
            {playbook.offers.map((o) => (
              <Card key={o.name} className="flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[15px] font-bold">{o.name}</h3>
                  <Badge tone="success" icon={<Tag className="size-3" aria-hidden />}>{o.priceRange}</Badge>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted">{o.description}</p>
                <p className="mt-3 text-[13px] text-faint">{o.whyItSells}</p>
              </Card>
            ))}
          </div>
        </section>

        <div className="grid gap-x-6 gap-y-8 lg:grid-cols-2">
          <section>
            <SectionHeader title="Who to Target" />
            <Card pad={false} className="divide-y divide-line">
              {playbook.idealClients.map((c) => (
                <div key={c} className="flex items-start gap-3 px-4 py-3.5 text-sm">
                  <Users className="mt-0.5 size-4 shrink-0 text-brand-300" aria-hidden />
                  <span className="text-ink-soft">{c}</span>
                </div>
              ))}
            </Card>
          </section>
          <section>
            <SectionHeader title="Where to Find Them" />
            <Card pad={false} className="divide-y divide-line">
              {playbook.whereToFind.map((w) => (
                <div key={w.channel} className="flex items-start gap-3 px-4 py-3.5">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-brand-300" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold">{w.channel}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{w.how}</p>
                  </div>
                </div>
              ))}
            </Card>
          </section>
        </div>

        <section>
          <SectionHeader title="Messages to Send" />
          <div className="grid gap-3 lg:grid-cols-3">
            {playbook.outreachTemplates.map((t) => (
              <Card key={t.title} className="flex flex-col">
                <div className="flex items-center gap-2">
                  <MessageSquareText className="size-4 text-brand-300" aria-hidden />
                  <h3 className="min-w-0 flex-1 truncate text-[15px] font-bold">{t.title}</h3>
                  <Badge>{t.stage}</Badge>
                </div>
                <p className="mt-3 flex-1 text-sm leading-relaxed whitespace-pre-line text-ink-soft">{t.body}</p>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => void copy(t.body)} icon={<Copy className="size-3.5" aria-hidden />}>Copy</Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      saveTemplate(t.title, t.body)
                      toast.success('Saved to your templates')
                    }}
                    icon={<Save className="size-3.5" aria-hidden />}
                  >
                    Save
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <div className="grid gap-x-6 gap-y-8 lg:grid-cols-2">
          <section>
            <SectionHeader title="When They Push Back" />
            <Card pad={false} className="divide-y divide-line">
              {playbook.objections.map((o) => (
                <div key={o.objection} className="px-4 py-3.5">
                  <p className="text-[15px] font-semibold">“{o.objection}”</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">{o.reply}</p>
                </div>
              ))}
            </Card>
          </section>
          <section>
            <SectionHeader title="Avoid These" />
            <Card pad={false} className="divide-y divide-line">
              {playbook.pitfalls.map((p) => (
                <div key={p} className="flex items-start gap-3 px-4 py-3.5 text-sm">
                  <ShieldAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
                  <span className="text-ink-soft">{p}</span>
                </div>
              ))}
            </Card>
          </section>
        </div>

        <Button variant="ghost" onClick={() => void build()} icon={<RefreshCw className="size-4" aria-hidden />}>Rebuild Playbook</Button>
      </div>
    </Page>
  )
}
