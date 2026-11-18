import { useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/cn'

export type MascotMood = 'happy' | 'thinking' | 'excited' | 'wink' | 'sad' | 'sleepy' | 'love' | 'focused'
/** One-shot clips that play over the mood loop, then hand back to it. */
export type MascotReaction = 'tap' | 'greeting' | 'celebrate'

interface MascotProps {
  mood?: MascotMood
  size?: number
  /** Tapping her plays a reaction and a new line. */
  interactive?: boolean
  /** Speech bubble text. When interactive, taps cycle through `tapLines` instead. */
  say?: string
  tapLines?: string[]
  float?: boolean
  className?: string
  bubbleSide?: 'top' | 'right'
  /** Played once when she first appears, before the mood loop. */
  entrance?: MascotReaction
}

const DEFAULT_TAP_LINES = ['Hehe, that tickles!', 'Less theory. More action.', 'One mission a day. That is the whole trick.', "I believe in you. Statistically AND emotionally.", 'Your first client is closer than you think.']

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Penny — FirstRevenue's cat mascot, played from generated video clips with a transparent
 * background (`public/mascot/`, made by `scripts/mascot-clips.sh`). Each mood loops; tapping her
 * plays a reaction (a hop, or a celebration while she's excited) and a new speech-bubble line.
 */
export function Mascot({ mood = 'happy', size = 160, interactive = true, say, tapLines = DEFAULT_TAP_LINES, float = true, className, bubbleSide = 'top', entrance }: MascotProps) {
  const [still] = useState(reducedMotion)
  const [playing, setPlaying] = useState<{ clip: MascotReaction; n: number } | null>(() => (entrance && !still ? { clip: entrance, n: 0 } : null))
  const [reaction, setReaction] = useState<{ n: number; line: string } | null>(null)

  const onTap = useCallback(() => {
    if (!interactive) return
    if (!still) setPlaying((p) => ({ clip: mood === 'excited' ? 'celebrate' : 'tap', n: (p?.n ?? 0) + 1 }))
    setReaction((r) => {
      const n = r ? r.n + 1 : 0
      return { n, line: tapLines[n % tapLines.length] }
    })
  }, [interactive, tapLines, mood, still])

  useEffect(() => {
    if (!reaction) return
    const t = setTimeout(() => setReaction(null), 2600)
    return () => clearTimeout(t)
  }, [reaction])

  const clip = playing?.clip ?? mood
  const bubble = reaction?.line ?? say

  return (
    <div className={cn('relative inline-flex select-none flex-col items-center', className)} style={{ width: size }}>
      {bubble && (
        <div
          key={bubble}
          role="status"
          className={cn(
            'absolute z-10 w-max max-w-[220px] animate-pop rounded-2xl border border-line-strong bg-surface-3 px-3.5 py-2 text-center text-[13px] leading-snug font-medium text-ink-soft shadow-card',
            bubbleSide === 'top' ? 'bottom-full left-1/2 mb-1 -translate-x-1/2' : 'top-2 left-full ml-1 text-left',
          )}
        >
          {bubble}
          <span
            aria-hidden
            className={cn(
              'absolute size-3 rotate-45 border-line-strong bg-surface-3',
              bubbleSide === 'top' ? '-bottom-1.5 left-1/2 -translate-x-1/2 border-r border-b' : 'top-5 -left-1.5 border-b border-l',
            )}
          />
        </div>
      )}

      {/* soft glow */}
      <div aria-hidden className="pointer-events-none absolute top-[12%] left-1/2 size-[78%] -translate-x-1/2 animate-pulse-glow rounded-full bg-brand-500/35 blur-2xl" />

      <button
        type="button"
        onClick={onTap}
        tabIndex={interactive ? 0 : -1}
        aria-label={interactive ? 'Penny, your FirstRevenue mascot. Tap to say hi.' : 'Penny, your FirstRevenue mascot'}
        className={cn('relative block rounded-full', !interactive && 'pointer-events-none', interactive && 'cursor-pointer')}
        style={{ width: size, height: size }}
      >
        <div className={cn('size-full', float && !still && 'animate-float')}>
          {/* Remount per clip (and per repeat tap) so each one starts from its first frame. */}
          <video
            key={`${clip}-${playing?.n ?? 0}`}
            aria-hidden
            className="pointer-events-none size-full"
            poster={`/mascot/${clip}.png`}
            autoPlay={!still}
            loop={!playing}
            muted
            playsInline
            preload="auto"
            onEnded={() => setPlaying(null)}
          >
            {/* Safari only shows transparency in HEVC; everyone else skips this source and takes VP9. */}
            <source src={`/mascot/${clip}.mov`} type='video/quicktime; codecs="hvc1"' />
            <source src={`/mascot/${clip}.webm`} type="video/webm" />
          </video>
        </div>
      </button>
    </div>
  )
}
