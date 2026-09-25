import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BookmarkPlus, Check, Copy, PenLine, RefreshCw, Send, Sparkles, WifiOff } from 'lucide-react'
import { copyText } from '@/components/domain/OutreachTemplatesTab'
import { PremiumGate } from '@/components/domain/Paywall'
import { Page } from '@/components/layout/Page'
import { Mascot } from '@/components/mascot/Mascot'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SelectField, TextArea, TextField } from '@/components/ui/Inputs'
import { Sheet } from '@/components/ui/Sheet'
import { Skeleton } from '@/components/ui/Skeleton'
import { toast } from '@/components/ui/Toast'
import { generateOutreach, generatorOptions } from '@/data/messages'
import { cn } from '@/lib/cn'
import { useApp } from '@/store/useApp'

const SOMEONE_NEW = 'Someone new'
type Phase = 'idle' | 'loading' | 'done' | 'error'

function Generator() {
  const [params] = useSearchParams()
  const pathId = useApp((s) => s.pathId)
  const allProspects = useApp((s) => s.prospects)
  const saveTemplate = useApp((s) => s.saveTemplate)
  const logOutreach = useApp((s) => s.logOutreach)

  const prospects = useMemo(() => allProspects.filter((p) => p.path === pathId), [allProspects, pathId])
  // SelectField works on labels, so make every label unique even if two prospects share a name.
  const labels = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of prospects) map.set(map.has(p.name) ? `${p.name} (${p.business})` : p.name, p.id)
    return map
  }, [prospects])
  const initial = [...labels.entries()].find(([, id]) => id === params.get('prospect'))?.[0] ?? SOMEONE_NEW

  const [who, setWho] = useState(initial)
  const [newName, setNewName] = useState('')
  const [newBusiness, setNewBusiness] = useState('')
  const [service, setService] = useState(generatorOptions.services[pathId][0])
  const [tone, setTone] = useState(generatorOptions.tones[0])
  const [goal, setGoal] = useState(generatorOptions.goals[0])
  const [variant, setVariant] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState(false)
  const [sent, setSent] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [title, setTitle] = useState('')
  const timer = useRef<number | undefined>(undefined)
  const result = useRef<HTMLDivElement>(null)

  const prospect = prospects.find((p) => p.id === labels.get(who))
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const run = (nextVariant: number) => {
    window.clearTimeout(timer.current)
    setVariant(nextVariant)
    setPhase('loading')
    setEditing(false)
    setSent(false)
    window.setTimeout(() => result.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60)
    timer.current = window.setTimeout(() => {
      if (useApp.getState().settings.offline) return setPhase('error')
      setMessage(
        generateOutreach({
          name: prospect?.name ?? newName,
          business: prospect?.business ?? newBusiness,
          service,
          tone,
          goal,
          path: pathId,
          variant: nextVariant,
        }),
      )
      setPhase('done')
    }, 600)
  }

  const openSave = () => {
    setTitle(`${goal} · ${tone}`)
    setSaveOpen(true)
  }
  const confirmSave = () => {
    if (!title.trim()) return
    saveTemplate(title.trim(), message)
    setSaveOpen(false)
    toast.success('Saved to your templates')
  }
  const markSent = () => {
    if (!prospect) return
    logOutreach(prospect.id, message)
    setSent(true)
    toast.success(`Logged as sent to ${prospect.name.split(' ')[0]}`)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <Card className="space-y-4">
        <SelectField label="Prospect" value={who} onChange={setWho} options={[...labels.keys(), SOMEONE_NEW]} />
        {!prospect && (
          <div className="grid animate-fade-in gap-4 sm:grid-cols-2">
            <TextField label="Their first name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Jamie" autoComplete="off" />
            <TextField label={pathId === 'clipping' ? 'Channel or brand' : 'Business name'} value={newBusiness} onChange={(e) => setNewBusiness(e.target.value)} placeholder={pathId === 'clipping' ? 'The Growth Hour' : 'Rivera Dental'} autoComplete="off" />
          </div>
        )}
        <SelectField label="Service" value={service} onChange={setService} options={generatorOptions.services[pathId]} />
        <fieldset>
          <legend className="mb-1.5 text-[13px] font-medium text-muted">Tone</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Tone">
            {generatorOptions.tones.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={tone === t}
                onClick={() => setTone(t)}
                className={cn(
                  'h-11 rounded-md border text-[13px] font-semibold transition-all duration-200 active:scale-95',
                  tone === t ? 'border-brand-500/50 bg-brand-500/15 text-brand-300 shadow-glow-sm' : 'border-line bg-surface text-muted hover:border-line-strong hover:text-ink',
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </fieldset>
        <SelectField label="Goal" value={goal} onChange={setGoal} options={generatorOptions.goals} />
        <Button full size="lg" loading={phase === 'loading'} icon={<Sparkles className="size-5" aria-hidden />} onClick={() => run(phase === 'idle' ? 0 : variant + 1)}>
          {phase === 'idle' ? 'Generate message' : 'Generate a new one'}
        </Button>
      </Card>

      <div ref={result} className="scroll-mt-20 lg:sticky lg:top-20" aria-live="polite">
        {phase === 'idle' && (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-line px-6 py-10 text-center">
            <span aria-hidden className="flex size-12 items-center justify-center rounded-full bg-brand-500/15 text-brand-300"><PenLine className="size-5" /></span>
            <h2 className="mt-3 text-[17px] font-bold tracking-tight">Your message appears here</h2>
            <p className="mt-1 max-w-xs text-sm leading-relaxed text-muted">Pick who you're writing to and what you want. You'll get a short message you can send in under a minute.</p>
          </div>
        )}

        {phase === 'loading' && (
          <Card role="status" aria-label="Writing your message">
            <div className="flex items-center gap-3">
              <Mascot mood="thinking" size={56} interactive={false} />
              <div>
                <p className="text-[15px] font-semibold">Writing your message…</p>
                <p className="text-[13px] text-muted">Keeping it short and personal.</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {['w-1/2', 'w-full', 'w-11/12', 'w-4/5', 'w-full', 'w-2/3'].map((w, i) => (
                <Skeleton key={i} className={cn('h-3.5', w)} />
              ))}
            </div>
          </Card>
        )}

        {phase === 'error' && (
          <Card className="flex flex-col items-center text-center" role="alert">
            <span aria-hidden className="flex size-12 items-center justify-center rounded-full bg-danger/12 text-danger"><WifiOff className="size-5" /></span>
            <h2 className="mt-3 text-[17px] font-bold tracking-tight">Couldn't generate your message</h2>
            <p className="mt-1 max-w-xs text-sm leading-relaxed text-muted">You seem to be offline. Check your connection and try again. Your choices are kept.</p>
            <Button className="mt-4" variant="secondary" icon={<RefreshCw className="size-4" aria-hidden />} onClick={() => run(variant)}>Retry</Button>
          </Card>
        )}

        {phase === 'done' && (
          <Card variant="hero" className="animate-scale-in">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-[17px] font-bold tracking-tight">{prospect ? `Message for ${prospect.name.split(' ')[0]}` : 'Your message'}</h2>
              <span className="tabular text-xs text-faint">Version {variant + 1} · {message.trim().split(/\s+/).length} words</span>
            </div>
            {editing ? (
              <TextArea label="Edit message" rows={12} value={message} onChange={(e) => setMessage(e.target.value)} />
            ) : (
              <p className="rounded-lg border border-line bg-bg-sunken/70 p-4 text-[15px] leading-relaxed whitespace-pre-wrap text-ink-soft">{message}</p>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <Button icon={<Copy className="size-4" aria-hidden />} onClick={() => copyText(message, 'Message copied')}>Copy</Button>
              <Button variant="secondary" icon={<RefreshCw className="size-4" aria-hidden />} onClick={() => run(variant + 1)}>Regenerate</Button>
              <Button variant="secondary" icon={editing ? <Check className="size-4" aria-hidden /> : <PenLine className="size-4" aria-hidden />} onClick={() => setEditing((e) => !e)}>{editing ? 'Done editing' : 'Edit'}</Button>
              <Button variant="secondary" disabled={!message.trim()} icon={<BookmarkPlus className="size-4" aria-hidden />} onClick={openSave}>Save Template</Button>
            </div>
            {prospect &&
              (sent ? (
                <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-success/10 px-3 py-2.5 text-sm font-medium text-success">
                  <Check className="size-4 shrink-0" aria-hidden /> Logged as sent.
                  <Link to={`/prospects/${prospect.id}`} className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4">View {prospect.name.split(' ')[0]}</Link>
                </p>
              ) : (
                <Button className="mt-2.5" full variant="success" disabled={!message.trim()} icon={<Send className="size-4" aria-hidden />} onClick={markSent}>Mark as sent</Button>
              ))}
          </Card>
        )}
      </div>

      <Sheet open={saveOpen} onClose={() => setSaveOpen(false)} title="Save as template" description="Find it later under Outreach → Templates." footer={<Button full disabled={!title.trim()} onClick={confirmSave}>Save template</Button>}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            confirmSave()
          }}
        >
          <TextField label="Template title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Friendly first DM" autoFocus />
        </form>
      </Sheet>
    </div>
  )
}

export default function OutreachGenerate() {
  return (
    <Page title="Write a message" subtitle="Tell me who it's for. I'll draft it, you make it yours." back>
      <PremiumGate feature="Outreach Assistant" description="Generate personal outreach messages for any prospect, tone and goal in seconds.">
        <Generator />
      </PremiumGate>
    </Page>
  )
}
