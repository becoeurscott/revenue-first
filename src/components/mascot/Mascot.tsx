import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/lib/cn'

export type MascotMood = 'happy' | 'thinking' | 'excited' | 'wink' | 'sad' | 'sleepy' | 'love' | 'focused'

interface MascotProps {
  mood?: MascotMood
  size?: number
  /** Eyes follow the pointer, and tapping her triggers a reaction. */
  interactive?: boolean
  /** Speech bubble text. When interactive, taps cycle through `tapLines` instead. */
  say?: string
  tapLines?: string[]
  float?: boolean
  className?: string
  bubbleSide?: 'top' | 'right'
}

const DEFAULT_TAP_LINES = ['Hehe, that tickles!', 'Less theory. More action.', 'One mission a day. That is the whole trick.', "I believe in you. Statistically AND emotionally.", 'Your first client is closer than you think.']

const INK = '#2e1065'
const LIMB = '#7c3aed'

/**
 * Penny — FirstRevenue's brain mascot.
 * Pure SVG + CSS: pupils track the pointer, she blinks on her own,
 * and reacts (jump + new line) when tapped.
 */
export function Mascot({ mood = 'happy', size = 160, interactive = true, say, tapLines = DEFAULT_TAP_LINES, float = true, className, bubbleSide = 'top' }: MascotProps) {
  const gid = useId()
  const root = useRef<HTMLDivElement>(null)
  const [look, setLook] = useState({ x: 0, y: 0 })
  const [blink, setBlink] = useState(false)
  const [reaction, setReaction] = useState<{ n: number; line: string } | null>(null)
  const [jumping, setJumping] = useState(false)

  // Pointer tracking
  useEffect(() => {
    if (!interactive) return
    let frame = 0
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const el = root.current
        if (!el) return
        const r = el.getBoundingClientRect()
        const dx = e.clientX - (r.left + r.width / 2)
        const dy = e.clientY - (r.top + r.height / 2)
        const dist = Math.hypot(dx, dy) || 1
        const reach = Math.min(dist / 180, 1)
        setLook({ x: (dx / dist) * 4.5 * reach, y: (dy / dist) * 3.5 * reach })
      })
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(frame)
    }
  }, [interactive])

  // Natural blinking
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const loop = () => {
      t = setTimeout(
        () => {
          setBlink(true)
          setTimeout(() => setBlink(false), 140)
          loop()
        },
        2400 + Math.random() * 2600,
      )
    }
    loop()
    return () => clearTimeout(t)
  }, [])

  const onTap = useCallback(() => {
    if (!interactive) return
    setJumping(true)
    setReaction((r) => {
      const n = r ? r.n + 1 : 0
      return { n, line: tapLines[n % tapLines.length] }
    })
    setTimeout(() => setJumping(false), 650)
  }, [interactive, tapLines])

  useEffect(() => {
    if (!reaction) return
    const t = setTimeout(() => setReaction(null), 2600)
    return () => clearTimeout(t)
  }, [reaction])

  const activeMood: MascotMood = jumping ? 'excited' : mood
  const bubble = reaction?.line ?? say
  const lx = activeMood === 'thinking' ? 3 : look.x
  const ly = activeMood === 'thinking' ? -3.5 : look.y
  const eyesClosed = blink || activeMood === 'sleepy'

  return (
    <div ref={root} className={cn('relative inline-flex select-none flex-col items-center', className)} style={{ width: size }}>
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
        <div className={cn('size-full', float && !jumping && 'animate-float')}>
          <svg viewBox="0 0 200 200" className={cn('size-full overflow-visible', jumping && 'mascot-jump')} aria-hidden>
            <defs>
              <linearGradient id={`${gid}-body`} gradientUnits="userSpaceOnUse" x1="40" y1="30" x2="160" y2="160">
                <stop offset="0" stopColor="#f5b8ff" />
                <stop offset="0.45" stopColor="#c084fc" />
                <stop offset="1" stopColor="#7c3aed" />
              </linearGradient>
              <radialGradient id={`${gid}-shine`} cx="0.3" cy="0.2" r="0.6">
                <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* ground shadow */}
            <ellipse cx="100" cy="186" rx="38" ry="5" fill="#000" opacity="0.35" className={cn(float && 'mascot-shadow')} />

            {/* legs */}
            <g stroke={LIMB} strokeWidth="7" strokeLinecap="round" fill="none">
              <path d="M86 146 L84 172" />
              <path d="M114 146 L116 172" />
            </g>
            <ellipse cx="80" cy="175" rx="11" ry="6" fill={LIMB} />
            <ellipse cx="120" cy="175" rx="11" ry="6" fill={LIMB} />

            {/* arms */}
            <g stroke={LIMB} strokeWidth="7" strokeLinecap="round" fill="none" className="mascot-arms">
              {activeMood === 'excited' || activeMood === 'love' ? (
                <>
                  <path d="M40 96 Q22 80 22 58" />
                  <path d="M160 96 Q178 80 178 58" />
                </>
              ) : activeMood === 'thinking' ? (
                <>
                  <path d="M40 108 Q26 120 30 136" />
                  <path d="M158 112 Q160 134 128 130" />
                </>
              ) : activeMood === 'wink' ? (
                <>
                  <path d="M40 108 Q26 120 30 136" />
                  <path className="mascot-wave" d="M160 100 Q180 88 176 64" />
                </>
              ) : activeMood === 'sad' ? (
                <>
                  <path d="M42 112 Q34 130 40 144" />
                  <path d="M158 112 Q166 130 160 144" />
                </>
              ) : (
                <>
                  <path d="M40 108 Q24 118 26 134" />
                  <path d="M160 108 Q176 118 174 134" />
                </>
              )}
            </g>

            {/* brain body: overlapping lobes share one user-space gradient so they read as a single shape */}
            <g fill={`url(#${gid}-body)`}>
              <circle cx="62" cy="80" r="30" />
              <circle cx="86" cy="58" r="30" />
              <circle cx="116" cy="58" r="30" />
              <circle cx="140" cy="80" r="30" />
              <circle cx="148" cy="108" r="24" />
              <circle cx="52" cy="108" r="24" />
              <circle cx="74" cy="124" r="26" />
              <circle cx="100" cy="128" r="28" />
              <circle cx="126" cy="124" r="26" />
              <ellipse cx="100" cy="94" rx="54" ry="42" />
            </g>
            <ellipse cx="100" cy="90" rx="70" ry="60" fill={`url(#${gid}-shine)`} />

            {/* gyri */}
            <g stroke="#6d28d9" strokeOpacity="0.42" strokeWidth="3.5" strokeLinecap="round" fill="none">
              <path d="M100 30 q-6 8 0 16 q6 8 0 16" />
              <path d="M62 62 q10 -14 24 -4" />
              <path d="M44 88 q4 -12 16 -10" />
              <path d="M138 62 q-10 -14 -24 -4" />
              <path d="M156 88 q-4 -12 -16 -10" />
              <path d="M74 44 q8 -6 14 2" />
              <path d="M126 44 q-8 -6 -14 2" />
            </g>

            {/* cheeks */}
            <ellipse cx="68" cy="116" rx="9" ry="5.5" fill="#fb7185" opacity="0.55" />
            <ellipse cx="132" cy="116" rx="9" ry="5.5" fill="#fb7185" opacity="0.55" />

            {/* eyes */}
            <Eye cx={82} closed={eyesClosed} mood={activeMood} lx={lx} ly={ly} />
            <Eye cx={118} closed={eyesClosed || activeMood === 'wink'} wink={activeMood === 'wink'} mood={activeMood} lx={lx} ly={ly} />

            {/* brows */}
            {activeMood === 'sad' && (
              <g stroke={INK} strokeWidth="3.5" strokeLinecap="round">
                <path d="M72 84 L90 79" />
                <path d="M128 84 L110 79" />
              </g>
            )}
            {activeMood === 'focused' && (
              <g stroke={INK} strokeWidth="3.5" strokeLinecap="round">
                <path d="M72 80 L90 84" />
                <path d="M128 80 L110 84" />
              </g>
            )}

            {/* mouth */}
            <Mouth mood={activeMood} />

            {/* extras */}
            {activeMood === 'thinking' && (
              <g fill="#c4b5fd">
                <circle className="mascot-dot" cx="150" cy="40" r="4" />
                <circle className="mascot-dot" style={{ animationDelay: '0.2s' }} cx="164" cy="28" r="5.5" />
                <circle className="mascot-dot" style={{ animationDelay: '0.4s' }} cx="182" cy="14" r="7" />
              </g>
            )}
            {activeMood === 'sleepy' && (
              <g fill="#c4b5fd" fontFamily="Inter, sans-serif" fontWeight="800">
                <text className="mascot-dot" x="150" y="44" fontSize="16">z</text>
                <text className="mascot-dot" style={{ animationDelay: '0.3s' }} x="164" y="28" fontSize="22">Z</text>
              </g>
            )}
            {(activeMood === 'excited' || activeMood === 'love') && (
              <g fill="#fde68a">
                <Sparkle x={24} y={34} s={1} />
                <Sparkle x={176} y={30} s={0.8} delay="0.25s" />
                <Sparkle x={160} y={8} s={0.55} delay="0.5s" />
              </g>
            )}
          </svg>
        </div>
      </button>

      <style>{`
        .mascot-jump { animation: mascot-jump 0.65s var(--ease-spring); transform-origin: 50% 100%; }
        .mascot-wave { animation: mascot-wave 0.9s ease-in-out infinite; transform-origin: 160px 100px; }
        .mascot-dot { animation: mascot-dot 1.4s ease-in-out infinite; }
        .mascot-shadow { animation: mascot-shadow 4s ease-in-out infinite; transform-origin: 100px 186px; }
        .mascot-sparkle { animation: mascot-sparkle 1.2s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        @keyframes mascot-jump { 0% { transform: translateY(0) scale(1,1);} 20% { transform: translateY(4px) scale(1.08,0.9);} 50% { transform: translateY(-26px) scale(0.95,1.06);} 75% { transform: translateY(0) scale(1.05,0.94);} 100% { transform: translateY(0) scale(1,1);} }
        @keyframes mascot-wave { 0%,100% { transform: rotate(0);} 50% { transform: rotate(14deg);} }
        @keyframes mascot-dot { 0%,100% { opacity: 0.25; transform: translateY(0);} 50% { opacity: 1; transform: translateY(-3px);} }
        @keyframes mascot-shadow { 0%,100% { transform: scaleX(1); opacity: 0.35;} 50% { transform: scaleX(0.82); opacity: 0.22;} }
        @keyframes mascot-sparkle { 0%,100% { transform: scale(0.6) rotate(0); opacity: 0.4;} 50% { transform: scale(1.15) rotate(20deg); opacity: 1;} }
      `}</style>
    </div>
  )
}

function Eye({ cx, closed, wink, mood, lx, ly }: { cx: number; closed: boolean; wink?: boolean; mood: MascotMood; lx: number; ly: number }) {
  const cy = 98
  if (closed) {
    // happy arc for wink/blink, flat-ish for sleepy
    const d = mood === 'sleepy' ? `M${cx - 9} ${cy} Q${cx} ${cy + 6} ${cx + 9} ${cy}` : `M${cx - 9} ${cy + 2} Q${cx} ${cy - 8} ${cx + 9} ${cy + 2}`
    return <path d={wink ? `M${cx - 9} ${cy + 2} Q${cx} ${cy - 8} ${cx + 9} ${cy + 2}` : d} stroke={INK} strokeWidth="4" strokeLinecap="round" fill="none" />
  }
  if (mood === 'love') {
    return <path transform={`translate(${cx - 10} ${cy - 10}) scale(0.84)`} d="M12 21s-8-5.3-8-11.2C4 6.6 6.4 4.5 9 4.5c1.6 0 2.6.8 3 1.6.4-.8 1.4-1.6 3-1.6 2.6 0 5 2.1 5 5.3C20 15.700 12 21 12 21z" fill="#f43f5e" />
  }
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx="11.5" ry="12.5" fill="#fff" />
      {mood === 'excited' ? (
        <g transform={`translate(${cx} ${cy})`}>
          <circle r="9" fill={INK} />
          <path d="M0 -6.500 L1.800 -1.800 L6.500 0 L1.800 1.800 L0 6.500 L-1.800 1.800 L-6.500 0 L-1.800 -1.800 Z" fill="#fde68a" />
        </g>
      ) : (
        <g style={{ transform: `translate(${lx}px, ${ly}px)`, transition: 'transform 0.12s ease-out' }}>
          <circle cx={cx} cy={cy} r="6.5" fill={INK} />
          <circle cx={cx + 2.200} cy={cy - 2.400} r="2.200" fill="#fff" />
        </g>
      )}
    </g>
  )
}

function Mouth({ mood }: { mood: MascotMood }) {
  switch (mood) {
    case 'excited':
    case 'love':
      return (
        <g>
          <path d="M88 116 Q100 134 112 116 Z" fill={INK} />
          <path d="M94 124 Q100 130 106 124 Q100 121 94 124 Z" fill="#fb7185" />
        </g>
      )
    case 'thinking':
      return <path d="M94 121 Q100 118 107 121" stroke={INK} strokeWidth="3.5" strokeLinecap="round" fill="none" />
    case 'sad':
      return <path d="M90 124 Q100 114 110 124" stroke={INK} strokeWidth="3.5" strokeLinecap="round" fill="none" />
    case 'sleepy':
      return <ellipse cx="100" cy="121" rx="4" ry="5" fill={INK} />
    case 'focused':
      return <path d="M92 120 L108 120" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
    default:
      return <path d="M89 116 Q100 129 111 116" stroke={INK} strokeWidth="3.5" strokeLinecap="round" fill="none" />
  }
}

function Sparkle({ x, y, s, delay }: { x: number; y: number; s: number; delay?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path className="mascot-sparkle" style={{ animationDelay: delay }} d="M0 -12 L3 -3 L12 0 L3 3 L0 12 L-3 3 L-12 0 L-3 -3 Z" />
    </g>
  )
}
