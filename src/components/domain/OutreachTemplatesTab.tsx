import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, Trash2, Wand2 } from 'lucide-react'
import { Badge, type Tone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FilterChips } from '@/components/ui/Chips'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog, Sheet } from '@/components/ui/Sheet'
import { toast } from '@/components/ui/Toast'
import { outreachTemplates } from '@/data/messages'
import type { OutreachTemplate } from '@/data/types'
import { useApp } from '@/store/useApp'

type Stage = OutreachTemplate['stage']
type Filter = 'All' | Stage
const STAGES: readonly Filter[] = ['All', 'First touch', 'Follow-up', 'Reply', 'Closing']
const stageTone: Record<Stage, Tone> = { 'First touch': 'brand', 'Follow-up': 'warning', Reply: 'info', Closing: 'success' }

export async function copyText(text: string, label = 'Copied to clipboard') {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(label)
  } catch {
    toast.error("Couldn't copy. Select the text and copy it manually.")
  }
}

export function OutreachTemplatesTab() {
  const navigate = useNavigate()
  const pathId = useApp((s) => s.pathId)
  const custom = useApp((s) => s.customTemplates)
  const deleteTemplate = useApp((s) => s.deleteTemplate)
  const [filter, setFilter] = useState<Filter>('All')
  const [openId, setOpenId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const templates = useMemo(
    () => [...custom.filter((t) => t.path === 'all' || t.path === pathId), ...outreachTemplates.filter((t) => t.path === 'all' || t.path === pathId)],
    [custom, pathId],
  )
  const counts = useMemo(() => {
    const c: Partial<Record<Filter, number>> = { All: templates.length }
    for (const t of templates) c[t.stage] = (c[t.stage] ?? 0) + 1
    return c
  }, [templates])
  const visible = templates.filter((t) => filter === 'All' || t.stage === filter)
  const active = templates.find((t) => t.id === openId)
  const deleting = custom.find((t) => t.id === deleteId)

  return (
    <div className="space-y-4">
      <FilterChips options={STAGES} value={filter} onChange={setFilter} label="Filter by stage" counts={counts} />

      {visible.length === 0 ? (
        <EmptyState compact mood="thinking" title="No templates here" description={`There are no ${filter} templates for your path yet. Generate a message and save it as your own.`} action={<Button variant="secondary" onClick={() => setFilter('All')}>Show all templates</Button>} />
      ) : (
        <ul className="stagger grid gap-3 sm:grid-cols-2">
          {visible.map((t) => (
            <li key={t.id}>
              <button type="button" onClick={() => setOpenId(t.id)} className="flex h-full w-full flex-col rounded-xl border border-line bg-surface p-4 text-left transition-all duration-200 hover:border-line-strong hover:bg-surface-2 active:scale-[0.99]">
                <span className="flex flex-wrap items-center gap-2">
                  <Badge tone={stageTone[t.stage]}>{t.stage}</Badge>
                  {t.custom && <Badge tone="neutral">Saved by you</Badge>}
                </span>
                <span className="mt-2.5 block text-[15px] font-semibold">{t.title}</span>
                <span className="mt-1 line-clamp-3 block text-sm leading-relaxed text-muted">{t.body}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet
        open={!!active}
        onClose={() => setOpenId(null)}
        title={active?.title ?? 'Template'}
        description={active ? `${active.stage}${active.custom ? ' · Saved by you' : ''}` : undefined}
        footer={
          active && (
            <div className="flex gap-3">
              <Button variant="secondary" full icon={<Copy className="size-4" aria-hidden />} onClick={() => copyText(active.body, 'Template copied')}>Copy</Button>
              <Button full icon={<Wand2 className="size-4" aria-hidden />} onClick={() => navigate('/outreach/generate')}>Use in generator</Button>
            </div>
          )
        }
      >
        {active && (
          <>
            <p className="rounded-lg border border-line bg-surface p-4 text-[15px] leading-relaxed whitespace-pre-wrap text-ink-soft">{active.body}</p>
            <p className="mt-3 text-[13px] text-faint">Replace anything in [brackets] before sending. Personal first lines get the most replies.</p>
            {active.custom && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 -ml-2 h-11 text-danger hover:text-danger"
                icon={<Trash2 className="size-4" aria-hidden />}
                onClick={() => {
                  setDeleteId(active.id)
                  setOpenId(null)
                }}
              >
                Delete template
              </Button>
            )}
          </>
        )}
      </Sheet>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (!deleting) return
          deleteTemplate(deleting.id)
          toast('Template deleted')
        }}
        title="Delete this template?"
        description={deleting ? `"${deleting.title}" will be removed from your saved templates.` : ''}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  )
}
