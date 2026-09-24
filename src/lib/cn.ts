export type ClassValue = string | number | bigint | boolean | null | undefined

/** Tiny className joiner. */
export function cn(...parts: ClassValue[]): string {
  return parts.filter((p) => typeof p === 'string' && p).join(' ')
}

export const money = (n: number) => `$${n.toLocaleString('en-US')}`

/** Deterministic thumbnail/hero gradient from a hue. */
export function hueGradient(hue: number): string {
  return `radial-gradient(120% 120% at 0% 0%, hsl(${hue} 85% 58% / 0.95), transparent 60%), radial-gradient(120% 120% at 100% 100%, hsl(${(hue + 50) % 360} 80% 45% / 0.9), transparent 55%), linear-gradient(135deg, hsl(${hue} 60% 16%), hsl(${(hue + 30) % 360} 70% 10%))`
}
