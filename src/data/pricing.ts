import type { PathId } from './types'

export const pricingOptions: Record<
  PathId,
  { services: { label: string; base: number }[]; scopes: { label: string; mult: number }[] }
> = {
  clipping: {
    services: [
      { label: 'Short-form clip pack (captions + hook)', base: 225 },
      { label: 'Podcast episode highlights', base: 250 },
      { label: 'Live stream highlight reel', base: 200 },
      { label: 'Monthly clipping retainer', base: 300 },
    ],
    scopes: [
      { label: '5 clips', mult: 1 },
      { label: '10 clips', mult: 1.7 },
      { label: '20 clips', mult: 3 },
    ],
  },
  gbp: {
    services: [
      { label: 'Google Business Profile audit + fixes', base: 300 },
      { label: 'New profile setup & verification', base: 250 },
      { label: 'Review generation system', base: 275 },
      { label: 'Monthly profile management', base: 325 },
    ],
    scopes: [
      { label: 'Audit + core fixes', mult: 1 },
      { label: 'Full optimization', mult: 1.4 },
      { label: 'Optimization + 30 days of posts', mult: 1.9 },
    ],
  },
}

export const experienceLevels: { label: string; mult: number }[] = [
  { label: 'Beginner', mult: 0.8 },
  { label: 'Some experience', mult: 1 },
  { label: 'Experienced', mult: 1.3 },
]

export const clientSizes: { label: string; mult: number }[] = [
  { label: 'Small (under 25K audience / single location)', mult: 1 },
  { label: 'Medium (25K–250K audience / 2–5 locations)', mult: 1.25 },
  { label: 'Large (250K+ audience / 6+ locations)', mult: 1.6 },
]

export const turnarounds: { label: string; mult: number }[] = [
  { label: 'Standard (5–7 days)', mult: 1 },
  { label: 'Fast (2–3 days)', mult: 1.2 },
  { label: 'Rush (24h)', mult: 1.45 },
]

export const pricingDisclaimer = 'Pricing suggestions are estimates. Adjust based on your market and client.'

const round5 = (n: number): number => Math.round(n / 5) * 5

function findMult(list: { label: string; mult: number }[], label: string): number {
  return (list.find((o) => o.label === label) ?? list[0]).mult
}

export function recommendPrice(input: {
  path: PathId
  service: string
  experience: string
  clientSize: string
  scope: string
  turnaround: string
}): {
  low: number
  high: number
  breakdown: { label: string; amount: number }[]
  rationale: string
  tips: string[]
} {
  const options = pricingOptions[input.path]
  const service = options.services.find((s) => s.label === input.service) ?? options.services[0]
  const scopeMult = findMult(options.scopes, input.scope)
  const expMult = findMult(experienceLevels, input.experience)
  const sizeMult = findMult(clientSizes, input.clientSize)
  const turnMult = findMult(turnarounds, input.turnaround)

  const base = round5(service.base * expMult)
  const scopeAdj = round5(base * (scopeMult - 1))
  const work = base + scopeAdj
  const revisions = round5(work * 0.1)
  const rush = round5(work * (turnMult - 1))
  const sizeAdj = round5(work * (sizeMult - 1))

  const breakdown = [
    { label: 'Base service', amount: base },
    { label: 'Scope adjustment', amount: scopeAdj },
    { label: 'Revisions (2 rounds)', amount: revisions },
    { label: 'Rush delivery', amount: rush },
    { label: 'Client size adjustment', amount: sizeAdj },
  ]
  const mid = breakdown.reduce((sum, row) => sum + row.amount, 0)
  const low = round5(mid * 0.8)
  const high = round5(mid * 1.2)

  const levelNote =
    expMult < 1
      ? 'As a beginner, a slightly lower price makes it easy for a first client to say yes while you build proof.'
      : expMult > 1
        ? 'Your experience justifies a premium. Lead with results from past clients.'
        : 'With some results behind you, you can charge the standard market rate.'
  const rushNote = rush > 0 ? ' Faster delivery is priced in, so state the deadline clearly in your offer.' : ''
  const rationale =
    `For "${service.label}" a fair range is $${low}–$${high}, with $${mid} as your target. ` +
    `${levelNote}${rushNote} Quote the target, and only go toward $${low} in exchange for something: a testimonial, faster payment or a longer commitment.`

  const tips =
    input.path === 'clipping'
      ? [
          'Quote one price for the whole pack, never per clip or per hour.',
          'Ask for 50% upfront before you start editing.',
          'After delivery, offer a monthly retainer at a small discount.',
        ]
      : [
          'Anchor your price to one new customer: what is a new patient or member worth to them?',
          'Ask for 50% upfront and 50% when the fixes are live.',
          'Offer monthly posts and review replies as a follow-on retainer.',
        ]

  return { low, high, breakdown, rationale, tips }
}
