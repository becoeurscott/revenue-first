import { useState } from 'react'

const COLORS = ['#a855f7', '#8b5cf6', '#6366f1', '#22c55e', '#f59e0b', '#f472b6', '#ffffff']

/** Lightweight CSS confetti burst. Decorative only. */
export function Confetti({ count = 60 }: { count?: number }) {
  const [pieces] = useState(() =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: 10 + Math.random() * 80,
        cx: `${(Math.random() - 0.5) * 60}vw`,
        cy: `${55 + Math.random() * 40}vh`,
        cr: `${(Math.random() - 0.5) * 1440}deg`,
        delay: Math.random() * 0.5,
        color: COLORS[i % COLORS.length],
        w: 6 + Math.random() * 6,
        round: Math.random() > 0.6,
      })),
  )
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-[12%] animate-confetti"
          style={{
            left: `${p.left}%`,
            width: p.w,
            height: p.round ? p.w : p.w * 0.45,
            borderRadius: p.round ? '50%' : 2,
            background: p.color,
            animationDelay: `${p.delay}s`,
            ['--cx' as string]: p.cx,
            ['--cy' as string]: p.cy,
            ['--cr' as string]: p.cr,
          }}
        />
      ))}
    </div>
  )
}
