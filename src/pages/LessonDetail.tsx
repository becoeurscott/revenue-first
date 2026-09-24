import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Bookmark, Check, CheckCircle2, Lightbulb, Lock } from 'lucide-react'
import { LessonCard } from '@/components/domain/LessonCard'
import { ResourceCard } from '@/components/domain/ResourceCard'
import { Page } from '@/components/layout/Page'
import { Avatar, Badge } from '@/components/ui/Badge'
import { Button, IconButton } from '@/components/ui/Button'
import { Card, SectionHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProgressBar } from '@/components/ui/Progress'
import { toast } from '@/components/ui/Toast'
import { VideoPlayerMock } from '@/components/ui/VideoPlayerMock'
import { getLesson, lessonsForPath } from '@/data/lessons'
import { resources } from '@/data/resources'
import { isLessonLocked, lessonDay } from '@/lib/lessons'
import { useProgram } from '@/store/selectors'
import { useApp } from '@/store/useApp'

export default function LessonDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const lesson = getLesson(id)
  const { pathId, progress } = useProgram()
  const done = useApp((s) => !!id && s.completedLessons.includes(id))
  const saved = useApp((s) => !!id && s.savedLessons.includes(id))
  const completeLesson = useApp((s) => s.completeLesson)
  const toggleSaved = useApp((s) => s.toggleSavedLesson)
  const touchLesson = useApp((s) => s.touchLesson)
  const [watched, setWatched] = useState(0)

  const locked = lesson ? isLessonLocked(lesson, pathId, progress.completedDays) : false

  useEffect(() => {
    setWatched(0)
    if (lesson && !locked) touchLesson(lesson.id)
  }, [lesson, locked, touchLesson])

  const onProgress = useCallback((f: number) => setWatched((w) => Math.max(w, f)), [])
  const onEnded = useCallback(() => toast.info('Lesson finished — mark it complete to earn XP'), [])

  if (!lesson) {
    return (
      <Page title="Lesson" back="/lessons">
        <EmptyState mood="sad" title="Lesson not found" description="It may have moved. Browse the library to find what you need." action={<Button onClick={() => navigate('/lessons')}>Open Library</Button>} />
      </Page>
    )
  }

  const day = lessonDay(lesson, pathId)
  const linked = lesson.resourceIds.map((rid) => resources.find((r) => r.id === rid)).filter((r) => !!r)
  const templates = linked.filter((r) => r.type === 'Template' || r.type === 'Script')
  const others = linked.filter((r) => r.type !== 'Template' && r.type !== 'Script')
  const pool = lessonsForPath(pathId)
  const upNext = pool[pool.findIndex((l) => l.id === lesson.id) + 1]

  const markComplete = () => {
    completeLesson(lesson.id)
    toast.success('Lesson complete · +25 XP')
  }

  return (
    <Page
      title="Lesson"
      back
      actions={
        <IconButton label={saved ? 'Remove from saved' : 'Save lesson'} active={saved} onClick={() => { toggleSaved(lesson.id); toast(saved ? 'Removed from saved' : 'Saved for later') }}>
          <Bookmark className={saved ? 'size-5 fill-current' : 'size-5'} aria-hidden />
        </IconButton>
      }
    >
      <div className="lg:grid lg:grid-cols-5 lg:gap-8">
        <div className="lg:col-span-3">
          {locked ? (
            <div className="relative flex aspect-video flex-col items-center justify-center rounded-xl border border-dashed border-line-strong bg-bg-raised px-6 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-surface-3"><Lock className="size-6 text-muted" aria-hidden /></span>
              <p className="mt-3 text-base font-bold">Complete Day {day} to unlock</p>
              <p className="mt-1 max-w-xs text-sm text-muted">Lessons follow action here. Do the mission first, then learn how to do it better.</p>
              <Button className="mt-4" size="sm" onClick={() => navigate(day && day <= progress.currentDay ? `/mission/${day}` : '/plan')}>{day && day <= progress.currentDay ? 'Go to Mission' : 'View Plan'}</Button>
            </div>
          ) : (
            <VideoPlayerMock key={lesson.id} title={lesson.title} duration={lesson.duration} hue={lesson.hue} category={lesson.category} onProgress={onProgress} onEnded={onEnded} />
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Badge tone="brand">{lesson.category}</Badge>
            {day && <Badge>Day {day}</Badge>}
            {done && <Badge tone="success" icon={<CheckCircle2 className="size-3" aria-hidden />}>Completed</Badge>}
          </div>
          <h2 className="mt-3 text-[26px] leading-tight font-extrabold tracking-tight">{lesson.title}</h2>
          <div className="mt-3 flex items-center gap-2.5 text-[13px] text-muted">
            <Avatar name={lesson.instructor} size={28} />
            <span>{lesson.instructor}</span>
            <span aria-hidden>·</span>
            <span className="tabular">{lesson.duration}</span>
          </div>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">{lesson.summary}</p>

          {!locked && !done && (
            <div className="mt-5">
              <div className="mb-1.5 flex justify-between text-xs font-medium text-muted"><span>Your progress</span><span className="tabular">{Math.round(watched * 100)}%</span></div>
              <ProgressBar value={watched} label="Lesson progress" />
            </div>
          )}

          <section className="mt-8">
            <SectionHeader title="What you'll learn" />
            <Card>
              <ul className="space-y-3">
                {lesson.learn.map((item) => (
                  <li key={item} className="flex gap-3 text-[15px] leading-snug text-ink-soft">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-brand-300"><Check className="size-3" aria-hidden /></span>
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          </section>

          <section className="mt-8">
            <SectionHeader title="Key Takeaways" />
            <div className="space-y-2.5">
              {lesson.takeaways.map((t) => (
                <div key={t} className="flex gap-3 rounded-lg border border-line bg-surface p-4 text-sm leading-relaxed text-ink-soft">
                  <Lightbulb className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                  {t}
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="lg:col-span-2">
          {others.length > 0 && (
            <section className="mt-8 lg:mt-0">
              <SectionHeader title="Resources" to="/resources" />
              <div className="space-y-2.5">{others.map((r) => <ResourceCard key={r.id} resource={r} />)}</div>
            </section>
          )}
          {templates.length > 0 && (
            <section className="mt-8">
              <SectionHeader title="Templates" to="/outreach/templates" />
              <div className="space-y-2.5">{templates.map((r) => <ResourceCard key={r.id} resource={r} />)}</div>
            </section>
          )}
          {upNext && (
            <section className="mt-8">
              <SectionHeader title="Up next" />
              <LessonCard lesson={upNext} layout="row" locked={isLessonLocked(upNext, pathId, progress.completedDays)} />
            </section>
          )}

          {!locked && (
            <div className="sticky bottom-24 mt-8 lg:bottom-6">
              {done ? (
                <Button size="lg" full variant="secondary" onClick={() => navigate('/home')} iconRight={<ArrowRight className="size-5" aria-hidden />}>Back to Today</Button>
              ) : (
                <Button size="lg" full className="shadow-glow" onClick={markComplete} icon={<CheckCircle2 className="size-5" aria-hidden />}>Mark Lesson Complete</Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Page>
  )
}
