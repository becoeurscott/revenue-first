import { useEffect, useMemo, useState } from 'react'
import { LessonCard } from '@/components/domain/LessonCard'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/Button'
import { FilterChips, Tabs } from '@/components/ui/Chips'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchBar } from '@/components/ui/Inputs'
import { ProgressBar } from '@/components/ui/Progress'
import { Skeleton } from '@/components/ui/Skeleton'
import { lessonCategories, lessonsForPath } from '@/data/lessons'
import { isLessonLocked } from '@/lib/lessons'
import { useProgram } from '@/store/selectors'
import { useApp } from '@/store/useApp'

const VIEWS = ['All', 'Recently watched', 'Saved'] as const
type View = (typeof VIEWS)[number]

export default function Lessons() {
  const { pathId, progress, path } = useProgram()
  const completed = useApp((s) => s.completedLessons)
  const saved = useApp((s) => s.savedLessons)
  const recent = useApp((s) => s.recentLessons)
  const [view, setView] = useState<View>('All')
  const [category, setCategory] = useState('All')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 450)
    return () => clearTimeout(t)
  }, [])

  const all = useMemo(() => lessonsForPath(pathId), [pathId])
  const categories = useMemo(() => ['All', ...lessonCategories.filter((c) => all.some((l) => l.category === c))], [all])

  const list = useMemo(() => {
    let items = all
    if (view === 'Saved') items = saved.map((id) => all.find((l) => l.id === id)).filter((l) => !!l)
    if (view === 'Recently watched') items = recent.map((id) => all.find((l) => l.id === id)).filter((l) => !!l)
    if (category !== 'All') items = items.filter((l) => l.category === category)
    const q = query.trim().toLowerCase()
    if (q) items = items.filter((l) => `${l.title} ${l.category} ${l.summary}`.toLowerCase().includes(q))
    return items
  }, [all, view, category, query, saved, recent])

  const watched = all.filter((l) => completed.includes(l.id)).length
  const reset = () => { setQuery(''); setCategory('All'); setView('All') }

  return (
    <Page large title="Lessons" subtitle={`${path.name} curriculum + the shared library`}>
      <div className="mb-5 rounded-xl border border-line bg-surface p-4">
        <div className="mb-2 flex justify-between text-[13px]"><span className="font-medium text-muted">Lessons watched</span><span className="tabular font-semibold">{watched} / {all.length}</span></div>
        <ProgressBar value={watched / all.length} label="Lessons watched" />
      </div>

      <div className="space-y-3">
        <SearchBar value={query} onChange={setQuery} placeholder="Search lessons" />
        <Tabs options={VIEWS} value={view} onChange={setView} label="Lesson views" />
        <FilterChips options={categories} value={category} onChange={setCategory} label="Filter by category" />
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3" role="status" aria-label="Loading lessons">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="rounded-xl border border-line bg-surface p-2.5"><Skeleton className="aspect-video w-full rounded-lg" /><Skeleton className="mt-3 h-3.5 w-4/5" /><Skeleton className="mt-2 mb-1.5 h-3 w-2/5" /></div>
            ))}
          </div>
        ) : list.length ? (
          <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-3">
            {list.map((l) => (
              <LessonCard key={l.id} lesson={l} locked={isLessonLocked(l, pathId, progress.completedDays)} />
            ))}
          </div>
        ) : view === 'Saved' && !query && category === 'All' ? (
          <EmptyState title="No saved lessons" description="Tap the bookmark on any lesson to keep it here for later." action={<Button variant="secondary" onClick={() => setView('All')}>Browse Lessons</Button>} />
        ) : view === 'Recently watched' && !query && category === 'All' ? (
          <EmptyState mood="sleepy" title="Nothing watched yet" description="Lessons you open will show up here so you can pick up where you left off." action={<Button variant="secondary" onClick={() => setView('All')}>Browse Lessons</Button>} />
        ) : (
          <EmptyState mood="thinking" title="No lessons found" description={query ? `Nothing matches “${query}”. Try a broader word like “outreach” or “pricing”.` : 'No lessons in this category yet.'} action={<Button variant="secondary" onClick={reset}>Clear Filters</Button>} />
        )}
      </div>
    </Page>
  )
}
