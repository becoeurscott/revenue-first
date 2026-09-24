import { Link } from 'react-router-dom'
import { Bookmark, CheckCircle2, Lock, Play } from 'lucide-react'
import type { Lesson } from '@/data/types'
import { cn, hueGradient } from '@/lib/cn'
import { useApp } from '@/store/useApp'

export function LessonThumb({ lesson, className, locked }: { lesson: Lesson; className?: string; locked?: boolean }) {
  return (
    <div className={cn('relative aspect-video overflow-hidden rounded-lg', className)} style={{ background: hueGradient(lesson.hue) }} aria-hidden>
      <div className="absolute -top-6 -right-6 size-24 rounded-full border-[12px] border-white/10" />
      <div className="absolute bottom-3 left-3 h-8 w-14 -rotate-6 rounded-md border border-white/15 bg-white/5" />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-black/35 text-white ring-1 ring-white/25 backdrop-blur">
          {locked ? <Lock className="size-4" /> : <Play className="ml-0.5 size-4 fill-current" />}
        </span>
      </span>
      <span className="tabular absolute right-2 bottom-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-semibold text-white">{lesson.duration}</span>
    </div>
  )
}

/** `row` = compact horizontal list item; `tile` = thumbnail-first grid card. */
export function LessonCard({ lesson, layout = 'tile', locked }: { lesson: Lesson; layout?: 'tile' | 'row'; locked?: boolean }) {
  const done = useApp((s) => s.completedLessons.includes(lesson.id))
  const saved = useApp((s) => s.savedLessons.includes(lesson.id))
  const meta = (
    <p className="mt-1 flex items-center gap-1.5 text-xs text-faint">
      <span className="truncate">{lesson.category}</span>
      <span aria-hidden>·</span>
      <span className="tabular shrink-0">{lesson.minutes} min</span>
      {saved && <Bookmark className="size-3 shrink-0 fill-current text-brand-300" aria-label="Saved" />}
    </p>
  )
  const check = done && <CheckCircle2 className="size-4.5 shrink-0 text-success" aria-label="Completed" />
  if (layout === 'row') {
    return (
      <Link to={`/lessons/${lesson.id}`} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3 transition-all duration-200 hover:border-line-strong hover:bg-surface-2 active:scale-[0.99]">
        <LessonThumb lesson={lesson} locked={locked} className="w-28 shrink-0" />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm leading-snug font-semibold">{lesson.title}</h3>
          {meta}
        </div>
        {check}
      </Link>
    )
  }
  return (
    <Link to={`/lessons/${lesson.id}`} className="group block rounded-xl border border-line bg-surface p-2.5 transition-all duration-200 hover:border-line-strong hover:bg-surface-2 active:scale-[0.99]">
      <LessonThumb lesson={lesson} locked={locked} />
      <div className="flex items-start gap-2 px-1.5 pt-3 pb-1.5">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm leading-snug font-semibold">{lesson.title}</h3>
          {meta}
        </div>
        {check}
      </div>
    </Link>
  )
}
