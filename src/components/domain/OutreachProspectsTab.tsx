import { useMemo, useState } from 'react'
import { Plus, UserPlus } from 'lucide-react'
import { PROSPECT_STATUSES, ProspectCard } from '@/components/domain/ProspectCard'
import { useFakeLoad } from '@/components/domain/useFakeLoad'
import { Button } from '@/components/ui/Button'
import { FilterChips } from '@/components/ui/Chips'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchBar, SelectField, TextArea, TextField } from '@/components/ui/Inputs'
import { Sheet } from '@/components/ui/Sheet'
import { ListSkeleton } from '@/components/ui/Skeleton'
import { toast } from '@/components/ui/Toast'
import type { PathId, ProspectStatus } from '@/data/types'
import { money } from '@/lib/cn'
import { useApp } from '@/store/useApp'

type Filter = 'All' | ProspectStatus
const FILTERS: readonly Filter[] = ['All', ...PROSPECT_STATUSES]

const PLATFORMS: Record<PathId, string[]> = {
  clipping: ['YouTube', 'Podcast', 'Twitch', 'TikTok', 'Instagram', 'X (Twitter)', 'Other'],
  gbp: ['Google Maps', 'Facebook', 'Instagram', 'Website', 'Walk-in', 'Other'],
}

const emptyForm = { name: '', business: '', platform: '', audience: '', handle: '', value: '', about: '' }

export function OutreachProspectsTab() {
  const pathId = useApp((s) => s.pathId)
  const all = useApp((s) => s.prospects)
  const addProspect = useApp((s) => s.addProspect)
  const loading = useFakeLoad(500)
  const [filter, setFilter] = useState<Filter>('All')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [touched, setTouched] = useState(false)

  const prospects = useMemo(() => all.filter((p) => p.path === pathId), [all, pathId])
  const counts = useMemo(() => {
    const c: Partial<Record<Filter, number>> = { All: prospects.length }
    for (const s of PROSPECT_STATUSES) c[s] = prospects.filter((p) => p.status === s).length
    return c
  }, [prospects])
  const pipelineValue = prospects.filter((p) => !['Won', 'Lost'].includes(p.status)).reduce((t, p) => t + p.value, 0)

  const q = query.trim().toLowerCase()
  const visible = prospects.filter(
    (p) => (filter === 'All' || p.status === filter) && (!q || [p.name, p.business, p.platform, p.handle].some((f) => f.toLowerCase().includes(q))),
  )

  const set = (key: keyof typeof emptyForm) => (value: string) => setForm((f) => ({ ...f, [key]: value }))
  const openForm = () => {
    setForm({ ...emptyForm, platform: PLATFORMS[pathId][0] })
    setTouched(false)
    setOpen(true)
  }
  const nameError = touched && !form.name.trim() ? 'Add a contact name' : undefined
  const businessError = touched && !form.business.trim() ? (pathId === 'clipping' ? 'Add their channel or brand' : 'Add the business name') : undefined

  const submit = () => {
    setTouched(true)
    if (!form.name.trim() || !form.business.trim()) return
    addProspect({
      path: pathId,
      name: form.name.trim(),
      business: form.business.trim(),
      platform: form.platform || PLATFORMS[pathId][0],
      audience: form.audience.trim() || 'Audience unknown',
      handle: form.handle.trim(),
      value: Math.max(0, Math.round(Number(form.value) || 0)),
      about: form.about.trim(),
    })
    setOpen(false)
    toast.success(`${form.name.trim()} added to your prospects`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[13px] text-muted">Open pipeline</p>
          <p className="tabular text-2xl font-extrabold tracking-tight">
            {money(pipelineValue)} <span className="text-sm font-medium text-faint">· {prospects.length} prospect{prospects.length === 1 ? '' : 's'}</span>
          </p>
        </div>
        <Button size="sm" icon={<Plus className="size-4" aria-hidden />} onClick={openForm}>Add prospect</Button>
      </div>

      {prospects.length > 0 && (
        <>
          <SearchBar value={query} onChange={setQuery} placeholder="Search prospects" />
          <FilterChips options={FILTERS} value={filter} onChange={setFilter} label="Filter by status" counts={counts} />
        </>
      )}

      {loading ? (
        <ListSkeleton count={4} />
      ) : prospects.length === 0 ? (
        <EmptyState
          title="No prospects yet"
          description={pathId === 'clipping' ? 'Add the first creator you would love to clip for. Ten names is a pipeline.' : 'Add the first local business whose profile you could improve. Ten names is a pipeline.'}
          action={<Button icon={<UserPlus className="size-4" aria-hidden />} onClick={openForm}>Add your first prospect</Button>}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          compact
          mood="thinking"
          title="No results"
          description={q ? `Nothing matches "${query.trim()}"${filter !== 'All' ? ` in ${filter}` : ''}.` : `No prospects are marked ${filter} right now.`}
          action={<Button variant="secondary" onClick={() => { setQuery(''); setFilter('All') }}>Clear filters</Button>}
        />
      ) : (
        <div className="stagger grid gap-3 sm:grid-cols-2">
          {visible.map((p) => (
            <ProspectCard key={p.id} prospect={p} />
          ))}
        </div>
      )}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Add prospect"
        description="Just the basics. You can add notes later."
        footer={<Button full onClick={submit}>Save prospect</Button>}
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <TextField label="Contact name" value={form.name} onChange={(e) => set('name')(e.target.value)} placeholder="Jamie Rivera" error={nameError} autoComplete="off" />
          <TextField label={pathId === 'clipping' ? 'Channel or brand' : 'Business name'} value={form.business} onChange={(e) => set('business')(e.target.value)} placeholder={pathId === 'clipping' ? 'The Growth Hour Podcast' : 'Rivera Family Dental'} error={businessError} autoComplete="off" />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Platform" value={form.platform} onChange={set('platform')} options={PLATFORMS[pathId]} />
            <TextField label="Audience" value={form.audience} onChange={(e) => set('audience')(e.target.value)} placeholder={pathId === 'clipping' ? '52K subscribers' : '127 reviews'} autoComplete="off" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Handle or email" value={form.handle} onChange={(e) => set('handle')(e.target.value)} placeholder="@handle" autoComplete="off" />
            <TextField label="Potential value ($)" type="number" inputMode="numeric" min={0} value={form.value} onChange={(e) => set('value')(e.target.value)} placeholder="150" />
          </div>
          <TextArea label="About" rows={3} value={form.about} onChange={(e) => set('about')(e.target.value)} placeholder="Why are they a good fit? What did you notice?" />
          <button type="submit" className="sr-only" tabIndex={-1}>Save prospect</button>
        </form>
      </Sheet>
    </div>
  )
}
