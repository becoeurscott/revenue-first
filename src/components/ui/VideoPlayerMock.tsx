import { useEffect, useRef, useState } from 'react'
import { Maximize, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { cn, hueGradient } from '@/lib/cn'

interface Props {
  title: string
  duration: string
  hue: number
  category: string
  /** Called once the simulated playback reaches the end. */
  onEnded?: () => void
  onProgress?: (fraction: number) => void
}

const toSeconds = (d: string) => {
  const [m, s] = d.split(':').map(Number)
  return m * 60 + (s || 0)
}
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/**
 * Fake video player. No media is streamed — playback is simulated at 40×
 * so a demo viewer can watch a "12-minute lesson" finish in ~20 seconds.
 */
export function VideoPlayerMock({ title, duration, hue, category, onEnded, onProgress }: Props) {
  const total = toSeconds(duration)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [t, setT] = useState(0)
  const [full, setFull] = useState(false)
  const ended = useRef(false)

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => setT((v) => Math.min(v + 4, total)), 100)
    return () => clearInterval(id)
  }, [playing, total])

  useEffect(() => {
    onProgress?.(t / total)
    if (t >= total && !ended.current) {
      ended.current = true
      setPlaying(false)
      onEnded?.()
    }
  }, [t, total, onEnded, onProgress])

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    ended.current = false
    setT(((e.clientX - r.left) / r.width) * total)
  }

  return (
    <div className={cn('group relative overflow-hidden border border-line bg-black', full ? 'fixed inset-0 z-50 rounded-none' : 'aspect-video w-full rounded-xl')}>
      <div className="absolute inset-0" style={{ background: hueGradient(hue) }} aria-hidden />
      {/* abstract "footage" */}
      <div aria-hidden className={cn('absolute -top-10 -right-10 size-56 rounded-full border-[24px] border-white/10', playing && 'animate-spin-slow')} />
      <div aria-hidden className="absolute bottom-16 left-6 h-24 w-40 -rotate-6 rounded-2xl border border-white/15 bg-white/5 backdrop-blur-sm" />
      <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
        <span className="rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white/90 uppercase backdrop-blur">{category}</span>
        <span className="rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-semibold text-white/80 backdrop-blur">Simulated lesson · 40× speed</span>
      </div>
      {!playing && <p className="absolute right-6 bottom-16 left-6 text-xl leading-tight font-extrabold tracking-tight text-white drop-shadow sm:text-2xl">{title}</p>}

      <button type="button" onClick={() => { if (t >= total) { ended.current = false; setT(0) } setPlaying((p) => !p) }} aria-label={playing ? 'Pause lesson' : 'Play lesson'} className="absolute inset-0 flex items-center justify-center">
        <span className={cn('flex size-18 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/30 backdrop-blur-md transition-all duration-200 group-hover:scale-105', playing && 'opacity-0 group-hover:opacity-100')}>
          {playing ? <Pause className="size-7 fill-current" aria-hidden /> : <Play className="ml-1 size-7 fill-current" aria-hidden />}
        </span>
      </button>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pt-8 pb-2">
        <div onClick={seek} className="flex h-5 cursor-pointer items-center" role="slider" aria-label="Seek" aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.round(t)} tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'ArrowRight') setT((v) => Math.min(v + 15, total)); if (e.key === 'ArrowLeft') setT((v) => Math.max(v - 15, 0)) }}>
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/25">
            <div className="bg-brand-gradient h-full rounded-full" style={{ width: `${(t / total) * 100}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-1 text-white">
          <span className="tabular px-2 text-xs font-medium text-white/85">{fmt(t)} / {duration}</span>
          <span className="flex-1" />
          <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Unmute' : 'Mute'} className="flex size-10 items-center justify-center rounded-full hover:bg-white/10">
            {muted ? <VolumeX className="size-4.5" aria-hidden /> : <Volume2 className="size-4.5" aria-hidden />}
          </button>
          <button type="button" onClick={() => setFull((f) => !f)} aria-label={full ? 'Exit fullscreen' : 'Fullscreen'} className="flex size-10 items-center justify-center rounded-full hover:bg-white/10">
            <Maximize className="size-4.5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}
