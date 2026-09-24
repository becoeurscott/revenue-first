import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, ChevronRight, Clock, Lock, Target, TrendingUp } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { LessonCard } from '@/components/domain/LessonCard'
import { ProspectCard } from '@/components/domain/ProspectCard'
import { ResourceCard } from '@/components/domain/ResourceCard'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchBar } from '@/components/ui/Inputs'
import { ListSkeleton, Skeleton } from '@/components/ui/Skeleton'
import { lessons } from '@/data/lessons'
import { pathList } from '@/data/paths'
import { resources } from '@/data/resources'
import { useProgram } from '@/store/selectors'
import { useApp } from '@/store/useApp'

const POPULAR = ['outreach', 'pricing', 'follow-up', 'portfolio', 'objections', 'audit']
const LIMIT = 4

const chip = 'inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-[13px] font-semibold text-muted transition-all duration-200 hover:border-line-strong hover:text-ink active:scale-95'

function ResultGroup({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  if (!count) return null
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="text-[17px] font-bold tracking-tight">{title}</h2>
        <span className="tabular text-[13px] text-faint">{count > LIMIT ? `${LIMIT} of ${count}` : count}</span>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">{children}</div>
    </section>
  )
}

export default function Search() {
  const [params] = useSearchParams()
  const [query, setQuery] = useState(() => params.get('q') ?? '')
  const [debounced, setDebounced] = useState(query.trim())
  const recent = useApp((s) => s.recentSearches)
  const addRecent = useApp((s) => s.addRecentSearch)
  const clearRecent = useApp((s) => s.clearRecentSearches)
  const prospects = useApp((s) => s.prospects)
  const { pathId, plan, progress } = useProgram()

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query.trim()), 200)
    return () => window.clearTimeout(id)
  }, [query])

  const typed = query.trim()
  const pending = typed !== debounced
  const q = debounced.toLowerCase()

  const results = useMemo(() => {
    if (!q) return null
    const has = (...parts: (string | undefined)[]) => parts.join(' ').toLowerCase().includes(q)
    const inScope = (p: string) => p === 'all' || p === pathId
    return {
      lessons: lessons.filter((l) => inScope(l.path) && has(l.title, l.category, l.summary)),
      resources: resources.filter((r) => inScope(r.path) && has(r.title, r.type, r.description)),
      missions: plan.filter((d) => has(d.theme, d.missionTitle)),
      prospects: prospects.filter((p) => has(p.name, p.business, p.platform, p.status)),
      paths: pathList.filter((p) => has(p.name, p.tagline, p.service)),
    }
  }, [q, pathId, plan, prospects])

  const total = results ? results.lessons.length + results.resources.length + results.missions.length + results.prospects.length + results.paths.length : 0
  const remember = () => {
    if (typed.length >= 2) addRecent(typed)
  }

  return (
    <Page title="Search" back>
      <SearchBar value={query} onChange={setQuery} placeholder="Search lessons, resources, prospects…" autoFocus onSubmit={remember} />

      <div className="mt-6 pb-8">
        {!typed ? (
          <div className="animate-fade-in space-y-8">
            {recent.length > 0 && (
              <section>
                <div className="mb-1 flex items-center justify-between">
                  <h2 className="text-[17px] font-bold tracking-tight">Recent searches</h2>
                  <button type="button" onClick={clearRecent} className="-mr-1 inline-flex min-h-11 items-center px-1 text-[13px] font-semibold text-brand-300 hover:text-brand-400">Clear</button>
                </div>
                <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                  {recent.map((r) => (
                    <li key={r}>
                      <button type="button" onClick={() => setQuery(r)} className="flex min-h-12 w-full items-center gap-3 px-4 text-left text-[15px] transition-colors hover:bg-surface-2">
                        <Clock className="size-4 shrink-0 text-faint" aria-hidden />
                        <span className="min-w-0 flex-1 truncate">{r}</span>
                        <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-[17px] font-bold tracking-tight"><TrendingUp className="size-4.5 text-brand-300" aria-hidden /> Popular searches</h2>
              <div className="flex flex-wrap gap-2">
                {POPULAR.map((p) => (
                  <button key={p} type="button" className={chip} onClick={() => setQuery(p)}>{p}</button>
                ))}
              </div>
            </section>
          </div>
        ) : pending || !results ? (
          <div className="space-y-4">
            <Skeleton className="h-5 w-28" />
            <ListSkeleton count={3} />
          </div>
        ) : total === 0 ? (
          <EmptyState
            mood="sad"
            title={`No results for "${debounced}"`}
            description="Check the spelling or try a broader word. These usually find something:"
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {POPULAR.slice(0, 4).map((p) => (
                  <button key={p} type="button" className={chip} onClick={() => setQuery(p)}>{p}</button>
                ))}
              </div>
            }
          />
        ) : (
          <div className="animate-fade-in space-y-8" onClickCapture={remember}>
            <p className="tabular -mb-3 text-[13px] text-faint" role="status">{total} result{total === 1 ? '' : 's'} for "{debounced}"</p>

            <ResultGroup title="Lessons" count={results.lessons.length}>
              {results.lessons.slice(0, LIMIT).map((l) => <LessonCard key={l.id} lesson={l} layout="row" />)}
            </ResultGroup>

            <ResultGroup title="Resources" count={results.resources.length}>
              {results.resources.slice(0, LIMIT).map((r) => <ResourceCard key={r.id} resource={r} />)}
            </ResultGroup>

            <ResultGroup title="Missions" count={results.missions.length}>
              {results.missions.slice(0, LIMIT).map((d) => {
                const locked = d.day > progress.currentDay
                const done = progress.completedDays.includes(d.day)
                return (
                  <Link key={d.day} to={`/plan/day/${d.day}`} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4 transition-all duration-200 hover:border-line-strong hover:bg-surface-2 active:scale-[0.99]">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-brand-500/12 text-brand-300">
                      {locked ? <Lock className="size-5 text-faint" aria-label="Locked" /> : done ? <CheckCircle2 className="size-5 text-success" aria-label="Completed" /> : <Target className="size-5" aria-hidden />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">{d.theme}</span>
                      <span className="block truncate text-xs text-faint">Day {d.day} · {d.missionTitle}</span>
                    </span>
                    {locked ? <Badge>Locked</Badge> : <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden />}
                  </Link>
                )
              })}
            </ResultGroup>

            <ResultGroup title="Prospects" count={results.prospects.length}>
              {results.prospects.slice(0, LIMIT).map((p) => <ProspectCard key={p.id} prospect={p} />)}
            </ResultGroup>

            <ResultGroup title="Paths" count={results.paths.length}>
              {results.paths.map((p) => (
                <Link key={p.id} to={`/paths/${p.slug}`} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4 transition-all duration-200 hover:border-line-strong hover:bg-surface-2 active:scale-[0.99]">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-surface-3 text-xl" aria-hidden>{p.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[15px] font-semibold">{p.name}</span>
                      {p.id === pathId && <Badge tone="brand">Current</Badge>}
                    </span>
                    <span className="block truncate text-xs text-faint">{p.tagline}</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden />
                </Link>
              ))}
            </ResultGroup>
          </div>
        )}
      </div>
    </Page>
  )
}
