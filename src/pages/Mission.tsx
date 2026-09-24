import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Check, FileText, Minus, NotebookPen, SkipForward, Undo2, X } from 'lucide-react'
import { MissionComplete } from '@/components/domain/MissionComplete'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { TextArea } from '@/components/ui/Inputs'
import { ProgressBar } from '@/components/ui/Progress'
import { ConfirmDialog, Sheet } from '@/components/ui/Sheet'
import { toast } from '@/components/ui/Toast'
import { getLesson } from '@/data/lessons'
import { resources } from '@/data/resources'
import type { MissionTask } from '@/data/types'
import { cn } from '@/lib/cn'
import { useProgram } from '@/store/selectors'
import { useApp, type TaskState } from '@/store/useApp'

function TaskItem({ task, index, state, note, readOnly, onToggle, onSkip, onNote }: { task: MissionTask; index: number; state?: TaskState; note?: string; readOnly: boolean; onToggle: () => void; onSkip: () => void; onNote: () => void }) {
  const resource = resources.find((r) => r.id === task.resourceId)
  return (
    <li className={cn('rounded-xl border p-4 transition-all duration-300', state === 'done' ? 'border-success/25 bg-success/[0.05]' : state === 'skipped' ? 'border-line bg-bg-raised opacity-70' : 'border-line bg-surface')}>
      <div className="flex gap-3.5">
        <button
          type="button"
          role="checkbox"
          aria-checked={state === 'done'}
          aria-label={`${task.title}${state === 'skipped' ? ' (skipped)' : ''}`}
          disabled={readOnly}
          onClick={onToggle}
          className={cn(
            '-m-1.5 flex size-11 shrink-0 items-center justify-center rounded-full transition-transform active:scale-90 disabled:cursor-default',
          )}
        >
          <span className={cn('flex size-7 items-center justify-center rounded-full border-2 transition-all duration-300', state === 'done' ? 'border-success bg-success text-black' : state === 'skipped' ? 'border-line-strong text-faint' : 'border-line-strong hover:border-brand-400')}>
            {state === 'done' && <Check className="size-4 animate-pop" strokeWidth={3} aria-hidden />}
            {state === 'skipped' && <Minus className="size-4" aria-hidden />}
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold tracking-wider text-faint uppercase">Task {index + 1}</p>
          <h3 className={cn('mt-0.5 text-base font-semibold', state && 'text-muted line-through decoration-line-strong')}>{task.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted">{task.description}</p>

          {resource && (
            <Link to={`/resources/${resource.id}`} className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-full border border-brand-500/25 bg-brand-500/10 px-3 text-[13px] font-semibold text-brand-300 hover:bg-brand-500/20">
              <FileText className="size-3.5" aria-hidden /> {resource.title}
            </Link>
          )}
          {note && <p className="mt-3 rounded-md border-l-2 border-brand-400 bg-surface-2 px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap text-ink-soft">{note}</p>}

          {!readOnly && (
            <div className="-ml-2 mt-2 flex gap-1">
              <Button size="sm" variant="ghost" onClick={onNote} icon={<NotebookPen className="size-3.5" aria-hidden />}>{note ? 'Edit note' : 'Add note'}</Button>
              {state !== 'done' && (
                <Button size="sm" variant="ghost" onClick={onSkip} icon={state === 'skipped' ? <Undo2 className="size-3.5" aria-hidden /> : <SkipForward className="size-3.5" aria-hidden />}>
                  {state === 'skipped' ? 'Undo skip' : 'Skip'}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  )
}

export default function Mission() {
  const navigate = useNavigate()
  const { day } = useParams()
  const { plan, progress } = useProgram()
  const tasks = useApp((s) => s.tasks)
  const notes = useApp((s) => s.taskNotes)
  const setTask = useApp((s) => s.setTask)
  const setTaskNote = useApp((s) => s.setTaskNote)
  const completeMission = useApp((s) => s.completeMission)
  const streak = useApp((s) => s.streak)

  const [celebrate, setCelebrate] = useState(false)
  const [noteFor, setNoteFor] = useState<MissionTask | null>(null)
  const [draft, setDraft] = useState('')
  const [confirmSkips, setConfirmSkips] = useState(false)

  const d = plan.find((p) => p.day === Number(day))
  if (!d || d.day > progress.currentDay) return <Navigate to="/plan" replace />

  const alreadyDone = progress.completedDays.includes(d.day)
  const readOnly = alreadyDone && !celebrate
  const done = d.tasks.filter((t) => tasks[t.id] === 'done').length
  const skipped = d.tasks.filter((t) => tasks[t.id] === 'skipped').length
  const resolved = done + skipped
  const canComplete = resolved === d.tasks.length && done > 0

  const finish = () => {
    completeMission(d.day)
    setCelebrate(true)
  }

  if (celebrate) return <MissionComplete plan={d} streak={streak} lesson={getLesson(d.lessonId)} />

  return (
    <div className="flex min-h-dvh justify-center bg-bg">
      <div className="w-full max-w-2xl px-4 sm:px-6">
        <header className="safe-top sticky top-0 z-10 -mx-4 bg-bg/90 px-4 pb-4 backdrop-blur-xl sm:-mx-6 sm:px-6">
          <div className="flex h-14 items-center justify-between">
            <button type="button" onClick={() => navigate(-1)} aria-label="Close mission" className="-ml-2 flex size-11 items-center justify-center rounded-full hover:bg-surface-2">
              <X className="size-6" aria-hidden />
            </button>
            <span className="text-[13px] font-bold tracking-wider text-faint uppercase">Day {d.day} mission</span>
            <Badge tone="brand">+{d.xp} XP</Badge>
          </div>
          <div className="flex items-center gap-3">
            <ProgressBar value={resolved / d.tasks.length} label="Tasks completed" tone={canComplete || alreadyDone ? 'success' : 'brand'} />
            <span className="tabular shrink-0 text-[13px] font-semibold text-muted" aria-live="polite">{done} / {d.tasks.length} tasks completed</span>
          </div>
        </header>

        <main className="pb-40">
          <h1 className="mt-2 text-[28px] leading-tight font-extrabold tracking-tight">{d.theme}</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">{d.missionTitle}</p>
          {readOnly && <p className="mt-4 rounded-lg border border-success/25 bg-success/[0.06] px-4 py-3 text-sm font-medium text-success">You completed this mission. Here's what you did.</p>}

          <ol className="stagger mt-6 space-y-3">
            {d.tasks.map((t, i) => (
              <TaskItem
                key={t.id}
                task={t}
                index={i}
                state={tasks[t.id]}
                note={notes[t.id]}
                readOnly={readOnly}
                onToggle={() => setTask(t.id, tasks[t.id] === 'done' ? null : 'done')}
                onSkip={() => setTask(t.id, tasks[t.id] === 'skipped' ? null : 'skipped')}
                onNote={() => { setDraft(notes[t.id] ?? ''); setNoteFor(t) }}
              />
            ))}
          </ol>
        </main>

        <div className="safe-bottom fixed inset-x-0 bottom-0 z-10 flex justify-center border-t border-line bg-bg/92 px-4 pt-3 backdrop-blur-xl">
          <div className="w-full max-w-2xl pb-4 sm:px-2">
            {readOnly ? (
              <Button size="lg" full onClick={() => navigate(`/lessons/${d.lessonId}`)}>Go to Lesson</Button>
            ) : (
              <>
                {!canComplete && <p className="mb-2 text-center text-[13px] text-faint">{done === 0 && resolved === d.tasks.length ? 'Complete at least one task — skipping everything does not count.' : `${d.tasks.length - resolved} task${d.tasks.length - resolved === 1 ? '' : 's'} left. Check them off or skip.`}</p>}
                <Button size="lg" full disabled={!canComplete} className={cn(canComplete && 'shadow-glow')} onClick={() => (skipped > 0 ? setConfirmSkips(true) : finish())}>
                  Complete Mission
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <Sheet
        open={!!noteFor}
        onClose={() => setNoteFor(null)}
        title="Task note"
        description={noteFor?.title}
        footer={
          <Button full onClick={() => { if (noteFor) { setTaskNote(noteFor.id, draft.trim()); toast.success(draft.trim() ? 'Note saved' : 'Note removed') } setNoteFor(null) }}>
            Save Note
          </Button>
        }
      >
        <TextArea label="What did you find, learn or decide?" value={draft} onChange={(e) => setDraft(e.target.value)} rows={5} placeholder="e.g. Found 4 podcasters in the fitness niche with no clips channel." autoFocus />
      </Sheet>

      <ConfirmDialog
        open={confirmSkips}
        onClose={() => setConfirmSkips(false)}
        onConfirm={finish}
        title={`Complete with ${skipped} skipped task${skipped === 1 ? '' : 's'}?`}
        description="You'll still earn your XP and keep your streak. You can come back to skipped tasks any time from your plan."
        confirmLabel="Complete Mission"
      />
    </div>
  )
}
