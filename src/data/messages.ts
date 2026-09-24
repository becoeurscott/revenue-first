import type { OutreachTemplate, PathId } from './types'

export const outreachTemplates: OutreachTemplate[] = [
  {
    id: 't-01',
    path: 'clipping',
    title: 'Free sample clip DM',
    stage: 'First touch',
    body: `Hey [Name], I just watched "[Episode title]" and the part at [timestamp] about [topic] is a perfect short clip.

I cut a quick 30-second version with captions so you can see what I mean. Want me to send it over? No strings attached.

— Alex`,
  },
  {
    id: 't-02',
    path: 'clipping',
    title: 'Three clip ideas email',
    stage: 'First touch',
    body: `Hi [Name],

I'm a video editor and a fan of [Show name]. Your long episodes have moments that would do really well as Shorts, Reels and TikToks, but I noticed they aren't being clipped yet.

Three I'd start with:
1. [Timestamp] — [idea]
2. [Timestamp] — [idea]
3. [Timestamp] — [idea]

I can turn these into captioned clips within 5 days. Would a free sample of the first one be useful?

— Alex`,
  },
  {
    id: 't-03',
    path: 'clipping',
    title: 'Streamer highlight offer',
    stage: 'First touch',
    body: `Hey [Name], caught your stream on [day] — the [moment] had me laughing out loud.

I edit stream highlights into vertical clips for TikTok and Shorts. I'd like to cut your best three moments from this week for free so you can see how they perform. Should I go ahead?

— Alex`,
  },
  {
    id: 't-04',
    path: 'gbp',
    title: 'Quick profile audit email',
    stage: 'First touch',
    body: `Hi [Name],

I was looking for a [business type] in [City] and found [Business name] on Google Maps. Your reviews are good, but I noticed a few things on your profile that are probably costing you calls:

1. [Problem one]
2. [Problem two]
3. [Problem three]

I put together a short one-page audit with the fixes. Can I send it over? It's free and takes two minutes to read.

— Alex`,
  },
  {
    id: 't-05',
    path: 'gbp',
    title: 'Walk-in / phone opener',
    stage: 'First touch',
    body: `Hi, is [Name] around? My name is Alex — I help local businesses show up higher on Google Maps.

I looked at your Google profile this morning and found [number] things that are easy to fix, like [specific problem]. I wrote them down on one page. Could I leave it with you or email it to the right person?`,
  },
  {
    id: 't-06',
    path: 'gbp',
    title: 'Competitor comparison DM',
    stage: 'First touch',
    body: `Hi [Name], quick heads up: when I search "[service] near me" in [City], [Competitor] shows up above [Business name], even though your reviews are better.

The main difference is their profile is fully filled in — services, photos, weekly posts. I can do the same for yours in about a week. Want to see what I'd change?

— Alex`,
  },
  {
    id: 't-07',
    path: 'all',
    title: 'Gentle follow-up (day 3)',
    stage: 'Follow-up',
    body: `Hey [Name], just bumping this up in case it got buried. I know your inbox is busy.

The offer still stands: I'll send [the free sample / the one-page audit] and you can decide from there. Worth a look?

— Alex`,
  },
  {
    id: 't-08',
    path: 'all',
    title: 'Last follow-up (day 7)',
    stage: 'Follow-up',
    body: `Hi [Name], last note from me so I don't crowd your inbox.

If now isn't the right time, no problem at all. If it would help later, just reply "later" and I'll check back in a month. Either way, keep up the great work with [Business or show name].

— Alex`,
  },
  {
    id: 't-09',
    path: 'clipping',
    title: 'Reply to "How much is it?"',
    stage: 'Reply',
    body: `Thanks for getting back to me, [Name]!

The simplest way to start is a 5-clip starter pack for $150. You pick the episode, I find the moments, add captions and hooks, and deliver within 5 days with two rounds of revisions.

If you like the results, we can talk about a monthly pack. Want me to start with [Episode title]?

— Alex`,
  },
  {
    id: 't-10',
    path: 'gbp',
    title: 'Reply to "Send me more info"',
    stage: 'Reply',
    body: `Thanks [Name]! Here's the short version.

I fully optimize your Google Business Profile: services, categories, description, photos, attributes, booking link and a simple system for getting more reviews. It takes about a week and costs $[price], one time.

I attached the one-page audit for [Business name] so you can see exactly what I'd fix. Do you have 10 minutes this week to go through it?

— Alex`,
  },
  {
    id: 't-11',
    path: 'all',
    title: 'Closing: confirm and invoice',
    stage: 'Closing',
    body: `Great, [Name] — let's do it.

To confirm: [scope of work] for $[price], delivered by [date], with two rounds of revisions included.

I'll send a payment link in the next few minutes. As soon as it's paid I'll get started and send a first update by [day]. Excited to work together!

— Alex`,
  },
  {
    id: 't-12',
    path: 'all',
    title: 'Closing: turn a project into a retainer',
    stage: 'Closing',
    body: `Hi [Name], glad you're happy with the results!

Most clients keep the momentum going with a monthly plan: [monthly scope] for $[price] per month, cancel anytime. It saves you from thinking about it and keeps things consistent.

Want me to set that up starting [date]?

— Alex`,
  },
]

export const generatorOptions: { services: Record<PathId, string[]>; tones: string[]; goals: string[] } = {
  services: {
    clipping: ['Short-form clip pack', 'Podcast-to-Shorts clipping', 'Stream highlight clips', 'Monthly clipping retainer'],
    gbp: [
      'Google Business Profile Optimization',
      'Free profile audit',
      'Review generation setup',
      'Monthly profile management',
    ],
  },
  tones: ['Friendly', 'Professional', 'Casual', 'Direct'],
  goals: ['Start a conversation', 'Offer a free sample', 'Book a call', 'Follow up'],
}

interface ToneKit {
  greeting: (first: string) => string
  openers: ((business: string) => string)[]
  bodies: string[]
  closers: string[]
}

const toneKits: Record<string, ToneKit> = {
  Friendly: {
    greeting: (f) => `Hey ${f}!`,
    openers: [
      (b) => `I've been following ${b} for a little while and I really like what you're building.`,
      (b) => `I came across ${b} this week and ended up spending way longer on it than I planned, in a good way.`,
      (b) => `Quick note from a fan of ${b}. The quality really stands out compared to others in your space.`,
    ],
    bodies: [
      'I work with a small number of clients at a time, so everything gets my full attention and you always deal with me directly.',
      "I'm early in building this service, which means you get extra care, fast replies and a price that's easy to say yes to.",
      'I keep things simple: clear scope, quick turnaround, and two rounds of revisions so you end up with something you love.',
    ],
    closers: ['Either way, keep it up!', 'Thanks for reading this far!', 'Hope to hear from you.'],
  },
  Professional: {
    greeting: (f) => `Hi ${f},`,
    openers: [
      (b) => `I'm reaching out because I reviewed ${b} this week and noticed a clear opportunity you may not be using yet.`,
      (b) => `I took some time to look closely at ${b} and wanted to share one specific observation with you.`,
      (b) => `My name is Alex. I've been studying ${b} and I believe a small change could bring you noticeably more reach.`,
    ],
    bodies: [
      'My process is straightforward: a defined scope, a fixed price agreed upfront, delivery within one week, and two rounds of revisions included.',
      'I handle the work end to end, so it requires about ten minutes of your time in total. You approve, I deliver.',
      'You receive a clear scope and a fixed price before anything starts, and you only continue if the first results are useful.',
    ],
    closers: ['Thank you for your time.', 'I appreciate you considering it.', 'Best regards,'],
  },
  Casual: {
    greeting: (f) => `Hey ${f},`,
    openers: [
      (b) => `so I was checking out ${b} last night and had an idea I couldn't shake.`,
      (b) => `big fan of ${b}. Not going to write you an essay, promise.`,
      (b) => `found ${b} a few days ago and I think you're leaving some easy wins on the table.`,
    ],
    bodies: [
      "No big contract, no weird upsells. I do the work, you look at it, and if it's not useful you've lost nothing.",
      "It's just me, so you get fast replies and zero agency nonsense. Most things are done within the week.",
      "I take care of the whole thing. You'd spend maybe ten minutes on it, tops.",
    ],
    closers: ['No pressure at all.', 'Cheers!', 'Talk soon, hopefully.'],
  },
  Direct: {
    greeting: (f) => `${f},`,
    openers: [
      (b) => `I looked at ${b} and found something that is costing you attention every week.`,
      (b) => `short version: ${b} has a gap I can fix within a week.`,
      (b) => `I'll keep this brief. ${b} is good, and it could be reaching far more people than it does today.`,
    ],
    bodies: [
      'Fixed price, one-week delivery, two revision rounds. If the first result is not useful, you owe me nothing.',
      'I do the work end to end. You approve the result. It takes about ten minutes of your time.',
      'One clear scope, one price, no long-term commitment. You decide what happens after you see the results.',
    ],
    closers: ['Yes or no is fine.', 'Thanks.', 'Your call.'],
  },
}

const pathLines: Record<PathId, ((service: string, business: string) => string)[]> = {
  clipping: [
    (s) => `What I do: ${s}. I take your long-form content, find the strongest moments, and turn them into captioned vertical clips for Shorts, Reels and TikTok.`,
    (s, b) => `I offer ${s}: I pull the best 30–60 second moments out of ${b}, add hooks and captions, and hand you clips that are ready to post.`,
    (s) => `My service is ${s}. Your long videos already contain great short clips. They just need someone to cut, caption and package them every week.`,
  ],
  gbp: [
    (s, b) => `What I do: ${s}. I fix the things on the ${b} Google listing that decide who shows up first on Maps: services, photos, categories and reviews.`,
    (s) => `I offer ${s}. Most local businesses lose calls because their Google profile is half empty, and it's one of the easiest things to fix.`,
    (s, b) => `My service is ${s}. When people search nearby, a complete profile wins the call, and right now ${b} is missing a few key pieces.`,
  ],
}

const goalLines: Record<string, Record<PathId, string[]>> = {
  'Start a conversation': {
    clipping: [
      'Are short clips something you have been meaning to do more of?',
      'Is short-form on your radar for this quarter, or is it not a priority right now?',
      'Curious: who handles your Shorts and Reels at the moment?',
    ],
    gbp: [
      'Is showing up higher on Google Maps something you have been thinking about?',
      'Curious: who looks after your Google profile at the moment?',
      'Would it be useful if I shared the two or three things I noticed?',
    ],
  },
  'Offer a free sample': {
    clipping: [
      'Can I cut one clip from your latest episode for free, so you can judge the quality yourself?',
      "I'd like to send you one finished sample clip at no cost. Should I go ahead?",
      'I already have a moment in mind from your last upload. Want me to send a free sample?',
    ],
    gbp: [
      'Can I send you a free one-page audit showing exactly what I would fix?',
      "I've already written up a short audit of your profile. Want me to send it over, free?",
      "I'd like to send you a free list of the five quickest fixes. Should I go ahead?",
    ],
  },
  'Book a call': {
    clipping: [
      'Do you have 15 minutes this week for a quick call? I can walk you through a few clip ideas.',
      'Would a 15-minute call on Thursday or Friday work to go through the plan?',
      "Open to a short call this week? I'll bring three clip ideas made for your channel.",
    ],
    gbp: [
      'Do you have 15 minutes this week for a quick call? I can walk you through what I found.',
      'Would a 15-minute call on Thursday or Friday work? I will share my screen and show you the gaps.',
      'Open to a short call this week? I will bring a one-page audit of your profile.',
    ],
  },
  'Follow up': {
    clipping: [
      'I sent a note last week and wanted to bump it once. Is a free sample clip still worth a look?',
      'Following up on my earlier message in case it got buried. Should I send that sample clip?',
      "Circling back one time. If the timing is off, just say so and I'll check in next month.",
    ],
    gbp: [
      'I sent a note last week and wanted to bump it once. Is the free audit still worth a look?',
      'Following up on my earlier message in case it got buried. Should I send the audit over?',
      "Circling back one time. If the timing is off, just say so and I'll check in next month.",
    ],
  },
}

function pick<T>(items: T[], variant: number): T {
  const n = items.length
  return items[((Math.trunc(variant) % n) + n) % n]
}

/** Pure, offline message generator. No network calls. */
export function generateOutreach(input: {
  name: string
  business: string
  service: string
  tone: string
  goal: string
  path: PathId
  variant: number
}): string {
  const first = input.name.trim().split(/\s+/)[0] || 'there'
  const business = input.business.trim() || 'your business'
  const service = input.service.trim() || generatorOptions.services[input.path][0]
  const kit = toneKits[input.tone] ?? toneKits.Friendly
  const goals = goalLines[input.goal] ?? goalLines['Start a conversation']
  const v = input.variant

  const opener = pick(kit.openers, v)(business)
  // Offset the other parts so consecutive variants feel different everywhere.
  const pathLine = pick(pathLines[input.path], v + 1)(service, business)
  const body = pick(kit.bodies, v + 2)
  const cta = pick(goals[input.path], v)
  const closer = pick(kit.closers, v + 1)

  return [`${kit.greeting(first)} ${opener}`, pathLine, body, cta, `${closer}\n— Alex`].join('\n\n')
}
