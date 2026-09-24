import { useMemo, useState } from 'react'
import { Page } from '@/components/layout/Page'
import { ResourceCard, resourceIcons } from '@/components/domain/ResourceCard'
import { useFakeLoad } from '@/components/domain/useFakeLoad'
import { Button } from '@/components/ui/Button'
import { FilterChips } from '@/components/ui/Chips'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchBar } from '@/components/ui/Inputs'
import { ListSkeleton } from '@/components/ui/Skeleton'
import { resources } from '@/data/resources'
import type { Resource, ResourceType } from '@/data/types'
import { useApp } from '@/store/useApp'

const FILTERS = ['All', 'Saved', 'Templates', 'Tools', 'Guides', 'Checklists', 'Scripts', 'Calculators'] as const
type Filter = (typeof FILTERS)[number]

const TYPE_BY_FILTER: Partial<Record<Filter, ResourceType>> = {
  Templates: 'Template',
  Tools: 'Tool',
  Guides: 'Guide',
  Checklists: 'Checklist',
  Scripts: 'Script',
  Calculators: 'Calculator',
}

const GROUPS: { type: ResourceType; title: string }[] = [
  { type: 'Template', title: 'Templates' },
  { type: 'Script', title: 'Scripts' },
  { type: 'Checklist', title: 'Checklists' },
  { type: 'Guide', title: 'Guides' },
  { type: 'Tool', title: 'Tools' },
  { type: 'Calculator', title: 'Calculators' },
]

function Grid({ items }: { items: Resource[] }) {
  return (
    <div className="stagger grid gap-3 lg:grid-cols-2">
      {items.map((r) => (
        <ResourceCard key={r.id} resource={r} />
      ))}
    </div>
  )
}

export default function Resources() {
  const pathId = useApp((s) => s.pathId)
  const saved = useApp((s) => s.savedResources)
  const [filter, setFilter] = useState<Filter>('All')
  const [query, setQuery] = useState('')
  const loading = useFakeLoad(400)

  const available = useMemo(() => resources.filter((r) => r.path === 'all' || r.path === pathId), [pathId])

  const counts = useMemo(() => {
    const c: Partial<Record<Filter, number>> = { All: available.length, Saved: available.filter((r) => saved.includes(r.id)).length }
    for (const f of FILTERS) {
      const type = TYPE_BY_FILTER[f]
      if (type) c[f] = available.filter((r) => r.type === type).length
    }
    return c
  }, [available, saved])

  const q = query.trim().toLowerCase()
  const visible = useMemo(() => {
    let list = available
    if (filter === 'Saved') list = list.filter((r) => saved.includes(r.id))
    const type = TYPE_BY_FILTER[filter]
    if (type) list = list.filter((r) => r.type === type)
    if (q) list = list.filter((r) => `${r.title} ${r.description} ${r.type}`.toLowerCase().includes(q))
    return list
  }, [available, filter, saved, q])

  const reset = () => {
    setQuery('')
    setFilter('All')
  }

  let body
  if (loading) {
    body = <ListSkeleton count={5} />
  } else if (visible.length === 0 && q) {
    body = (
      <EmptyState
        mood="thinking"
        title="No resources found"
        description={`Nothing matches "${query.trim()}". Try a shorter word like "outreach", "pricing" or "checklist".`}
        action={<Button variant="secondary" onClick={reset}>Clear search</Button>}
      />
    )
  } else if (visible.length === 0 && filter === 'Saved') {
    body = (
      <EmptyState
        mood="wink"
        title="Nothing saved yet"
        description="Tap the bookmark on any template, script or checklist and it will be waiting for you here."
        action={<Button onClick={() => setFilter('All')}>Browse resources</Button>}
      />
    )
  } else if (visible.length === 0) {
    body = (
      <EmptyState
        mood="thinking"
        title={`No ${filter.toLowerCase()} on this path yet`}
        description="Everything else in the library is still ready to use."
        action={<Button variant="secondary" onClick={() => setFilter('All')}>Show all resources</Button>}
      />
    )
  } else if (filter === 'All') {
    body = (
      <div className="space-y-8">
        {GROUPS.map(({ type, title }) => {
          const items = visible.filter((r) => r.type === type)
          if (!items.length) return null
          const Icon = resourceIcons[type]
          return (
            <section key={type} aria-labelledby={`group-${type}`}>
              <div className="mb-3 flex items-center gap-2">
                <Icon className="size-4.5 text-brand-300" aria-hidden />
                <h2 id={`group-${type}`} className="text-[17px] font-bold tracking-tight">{title}</h2>
                <span className="tabular text-[13px] text-faint">{items.length}</span>
              </div>
              <Grid items={items} />
            </section>
          )
        })}
      </div>
    )
  } else {
    body = <Grid items={visible} />
  }

  return (
    <Page title="Resources" subtitle="Templates, scripts and tools — ready to use." large>
      <div className="space-y-3">
        <SearchBar value={query} onChange={setQuery} placeholder="Search resources" />
        <FilterChips options={FILTERS} value={filter} onChange={setFilter} label="Filter resources" counts={counts} />
      </div>
      <div className="mt-5 pb-4">{body}</div>
    </Page>
  )
}
