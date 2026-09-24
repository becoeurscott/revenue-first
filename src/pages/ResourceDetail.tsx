import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Bookmark, Check, Clock, Copy, RotateCcw } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { ResourceCard, resourceIcons } from '@/components/domain/ResourceCard'
import { Badge } from '@/components/ui/Badge'
import { Button, IconButton } from '@/components/ui/Button'
import { Card, SectionHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProgressBar } from '@/components/ui/Progress'
import { toast } from '@/components/ui/Toast'
import { paths } from '@/data/paths'
import { resources } from '@/data/resources'
import type { Resource } from '@/data/types'
import { cn } from '@/lib/cn'
import { useApp } from '@/store/useApp'

async function copyText(text: string, message: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(message)
  } catch {
    toast.error('Copy failed. Select the text and copy it manually.')
  }
}

function readChecked(key: string): string[] {
  try {
    const raw = localStorage.getItem(key)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function ChecklistBody({ resource }: { resource: Resource }) {
  const key = `fr:checklist:${resource.id}`
  const [checked, setChecked] = useState<string[]>(() => readChecked(key))
  useEffect(() => setChecked(readChecked(key)), [key])

  const persist = (next: string[]) => {
    setChecked(next)
    try {
      localStorage.setItem(key, JSON.stringify(next))
    } catch {
      /* storage unavailable — keep in memory */
    }
  }
  const total = resource.sections.reduce((n, s) => n + s.body.length, 0)
  const done = checked.length
  const complete = total > 0 && done >= total

  return (
    <div className="space-y-6">
      <Card variant={complete ? 'completed' : 'default'}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[15px] font-semibold">{complete ? 'All done — nice work' : 'Your progress'}</p>
            <p className="tabular text-[13px] text-muted">{done} of {total} checked</p>
          </div>
          {done > 0 && (
            <Button variant="ghost" size="sm" icon={<RotateCcw className="size-3.5" aria-hidden />} onClick={() => { persist([]); toast.info('Checklist reset') }}>
              Reset
            </Button>
          )}
        </div>
        <ProgressBar className="mt-3" value={total ? done / total : 0} tone={complete ? 'success' : 'brand'} label="Checklist progress" />
      </Card>

      {resource.sections.map((section, si) => (
        <section key={section.heading}>
          <h2 className="mb-3 text-[17px] font-bold tracking-tight">{section.heading}</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {section.body.map((item, ii) => {
              const id = `${si}-${ii}`
              const on = checked.includes(id)
              return (
                <li key={id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => persist(on ? checked.filter((x) => x !== id) : [...checked, id])}
                    className="flex min-h-14 w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2"
                  >
                    <span className={cn('mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border transition-all duration-200', on ? 'animate-pop border-transparent bg-success text-white' : 'border-line-strong')}>
                      {on && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
                    </span>
                    <span className={cn('text-[15px] leading-relaxed transition-colors', on ? 'text-faint line-through' : 'text-ink-soft')}>{item}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}

function CopyBody({ resource }: { resource: Resource }) {
  const all = resource.sections.map((s) => `${s.heading}\n\n${s.body.join('\n\n')}`).join('\n\n———\n\n')
  return (
    <div className="space-y-6">
      {resource.sections.map((section) => (
        <section key={section.heading}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="min-w-0 text-[17px] font-bold tracking-tight">{section.heading}</h2>
            <Button variant="secondary" size="sm" icon={<Copy className="size-3.5" aria-hidden />} onClick={() => copyText(section.body.join('\n\n'), 'Copied to clipboard')} aria-label={`Copy "${section.heading}"`}>
              Copy
            </Button>
          </div>
          <div className="rounded-lg border border-line border-l-2 border-l-brand-500/60 bg-bg-sunken p-4 font-mono text-[13px] leading-relaxed break-words whitespace-pre-wrap text-ink-soft">
            {section.body.join('\n\n')}
          </div>
        </section>
      ))}
      <Button variant="secondary" full size="lg" icon={<Copy className="size-4" aria-hidden />} onClick={() => copyText(all, `Copied the full ${resource.type.toLowerCase()}`)}>
        Copy all
      </Button>
    </div>
  )
}

function ReadBody({ resource }: { resource: Resource }) {
  const numbered = resource.type !== 'Guide'
  return (
    <div className="space-y-7">
      {resource.sections.map((section) => (
        <section key={section.heading}>
          <h2 className="mb-3 text-[17px] font-bold tracking-tight">{section.heading}</h2>
          {numbered ? (
            <ol className="space-y-3">
              {section.body.map((p, i) => (
                <li key={i} className="flex gap-3">
                  <span className="tabular flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-xs font-bold text-brand-300">{i + 1}</span>
                  <p className="pt-0.5 text-[15px] leading-relaxed text-ink-soft">{p}</p>
                </li>
              ))}
            </ol>
          ) : (
            <div className="max-w-2xl space-y-3">
              {section.body.map((p, i) => (
                <p key={i} className="text-[15px] leading-relaxed text-ink-soft">{p}</p>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}

export default function ResourceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const pathId = useApp((s) => s.pathId)
  const saved = useApp((s) => s.savedResources)
  const toggleSaved = useApp((s) => s.toggleSavedResource)
  const resource = resources.find((r) => r.id === id)

  const related = useMemo(() => {
    if (!resource) return []
    const pool = resources.filter((r) => r.id !== resource.id && (r.path === 'all' || r.path === pathId))
    const sameType = pool.filter((r) => r.type === resource.type)
    const samePath = pool.filter((r) => r.type !== resource.type && r.path === resource.path)
    const rest = pool.filter((r) => !sameType.includes(r) && !samePath.includes(r))
    return [...sameType, ...samePath, ...rest].slice(0, 3)
  }, [resource, pathId])

  if (!resource) {
    return (
      <Page title="Resource" back="/resources">
        <EmptyState mood="sad" title="Resource not found" description="This resource may have moved or the link is incorrect." action={<Button onClick={() => navigate('/resources')}>Browse resources</Button>} />
      </Page>
    )
  }

  const Icon = resourceIcons[resource.type]
  const isSaved = saved.includes(resource.id)
  const onSave = () => {
    toggleSaved(resource.id)
    if (isSaved) toast.info('Removed from saved')
    else toast.success('Saved to your resources')
  }

  return (
    <Page
      title={resource.type}
      back
      actions={
        <IconButton label={isSaved ? 'Remove from saved' : 'Save resource'} active={isSaved} aria-pressed={isSaved} onClick={onSave}>
          <Bookmark className={cn('size-5', isSaved && 'fill-current')} aria-hidden />
        </IconButton>
      }
    >
      <div className="animate-fade-up pb-6">
        <header className="flex items-start gap-4">
          <span className="bg-brand-gradient flex size-14 shrink-0 items-center justify-center rounded-lg text-white shadow-glow-sm">
            <Icon className="size-6" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl leading-tight font-extrabold tracking-tight">{resource.title}</h2>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <Badge tone="brand">{resource.type}</Badge>
              <Badge icon={<Clock className="size-3" aria-hidden />}>{resource.minutes} min</Badge>
              <Badge tone={resource.path === 'all' ? 'neutral' : 'info'}>{resource.path === 'all' ? 'All paths' : paths[resource.path].name}</Badge>
            </div>
          </div>
        </header>

        <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-muted">{resource.description}</p>

        {resource.link && (
          <Button className="mt-5 sm:w-auto" full size="lg" iconRight={<ArrowRight className="size-4.5" aria-hidden />} onClick={() => navigate(resource.link as string)}>
            Open {resource.title}
          </Button>
        )}

        <div className="mt-8">
          {resource.type === 'Checklist' ? <ChecklistBody resource={resource} /> : resource.type === 'Template' || resource.type === 'Script' ? <CopyBody resource={resource} /> : <ReadBody resource={resource} />}
        </div>

        {related.length > 0 && (
          <section className="mt-10">
            <SectionHeader title="Related resources" to="/resources" />
            <div className="grid gap-3 lg:grid-cols-3">
              {related.map((r) => (
                <ResourceCard key={r.id} resource={r} />
              ))}
            </div>
          </section>
        )}
      </div>
    </Page>
  )
}
