import type { PathId, PathInfo } from './types'

/** The two guided 30-day paths. ALL DATA IS FICTITIOUS. */
export const paths: Record<PathId, PathInfo> = {
  clipping: {
    id: 'clipping',
    slug: 'clipping',
    name: 'Short-Form Clipping',
    tagline: 'Turn long videos into short clips creators happily pay for.',
    emoji: '🎬',
    hue: 265,
    description:
      'Podcasters, YouTubers and streamers sit on hours of long-form content they never repurpose. You find the best moments, cut them into vertical clips for TikTok, Reels and Shorts, and sell that as a done-for-you service. No audience, no camera and no paid software required.',
    difficulty: 'Beginner',
    objective: 'Land your first paying clipping client and earn your first $500.',
    service: 'Done-for-you short-form clip packs cut from a creator’s long-form content.',
    typicalPrice: '$150–$250 per clip pack',
    skills: [
      'Spotting clip-worthy moments in long-form content',
      'Writing hooks that stop the scroll in the first 2 seconds',
      'Editing vertical video with captions and clean pacing',
      'Personalized cold outreach to creators',
      'Pricing and packaging a simple service',
      'Managing revisions and client communication',
    ],
    firstTasks: [
      'Watch 20 top-performing clips in one niche and note why they work',
      'Cut your first 3 sample clips from a public podcast episode',
      'Build a one-page portfolio with your best samples',
      'Find 10 creators who publish long-form content but post few clips',
    ],
    workflow: [
      'Find a creator who publishes long-form content but posts few or weak short clips',
      'Cut one free sample clip from their best recent episode',
      'Send a personalized message with the sample attached',
      'Agree on a clip pack, price and turnaround, then collect a 50% deposit',
      'Deliver the clips, handle one round of revisions and get approval',
      'Send the final invoice, get paid and offer a monthly retainer',
    ],
    weeks: [
      { week: 1, title: 'Foundations', focus: ['Understand clipping', 'Find creators', 'Build portfolio'] },
      { week: 2, title: 'Prospecting & Outreach', focus: ['Prospecting', 'Outreach', 'Pricing'] },
      { week: 3, title: 'Closing & Delivery', focus: ['Closing', 'Delivery', 'Revisions'] },
      { week: 4, title: 'Retention & Scale', focus: ['Retention', 'Upselling', 'Scaling'] },
    ],
    tools: [
      { name: 'CapCut', purpose: 'Edit vertical clips, add captions and zooms', cost: 'Free' },
      { name: 'Descript', purpose: 'Transcribe episodes and find moments by searching text', cost: '$0–$12/mo' },
      { name: 'Canva', purpose: 'Build your portfolio page and clip cover frames', cost: 'Free' },
      { name: 'Google Sheets', purpose: 'Track prospects, follow-ups and deals', cost: 'Free' },
      { name: 'Google Drive', purpose: 'Receive raw footage and deliver finished clips', cost: 'Free' },
      { name: 'Loom', purpose: 'Record short walkthroughs for pitches and revisions', cost: 'Free' },
    ],
  },
  gbp: {
    id: 'gbp',
    slug: 'google-business',
    name: 'Google Business Profiles',
    tagline: 'Help local businesses show up on Google Maps and get more calls.',
    emoji: '📍',
    hue: 210,
    description:
      'Most local businesses — dentists, gyms, salons, roofers, cafés — have a half-finished Google Business Profile that costs them customers every week. You audit the profile, show the owner exactly what is broken, and get paid to fix it. It is simple, repeatable work that owners immediately understand.',
    difficulty: 'Beginner',
    objective: 'Sign your first local business client and earn your first $500.',
    service: 'Google Business Profile audits and done-for-you optimization for local businesses.',
    typicalPrice: '$200–$400 per optimization',
    skills: [
      'Reading a Google Business Profile like a customer would',
      'Running a structured profile audit in under 20 minutes',
      'Explaining problems in plain language owners care about',
      'Outreach by email, phone and walk-in',
      'Optimizing categories, services, photos and descriptions',
      'Reporting results with simple before-and-after numbers',
    ],
    firstTasks: [
      'Study 5 top-ranked local profiles and note what they have in common',
      'Pick one city and one business type to focus on',
      'List 10 local businesses with incomplete or outdated profiles',
      'Run your first full audit and turn it into a one-page report',
    ],
    workflow: [
      'Find a local business with a weak profile: few photos, missing services, unanswered reviews',
      'Run a 20-minute audit and turn it into a one-page report',
      'Send the audit to the owner with 3 specific problems highlighted',
      'Walk through the fixes on a short call and agree on a price',
      'Get manager access, complete the optimization and document before-and-after',
      'Send the results report, get paid and offer a monthly retainer',
    ],
    weeks: [
      { week: 1, title: 'Foundations', focus: ['Understand profiles', 'Find local businesses', 'Run your first audit'] },
      { week: 2, title: 'Audits & Outreach', focus: ['Identify problems', 'Create audits', 'Outreach'] },
      { week: 3, title: 'Pricing & Onboarding', focus: ['Pricing', 'Closing', 'Client onboarding'] },
      { week: 4, title: 'Optimization & Reporting', focus: ['Optimization', 'Reporting', 'Retainers'] },
    ],
    tools: [
      { name: 'Google Maps', purpose: 'Find local businesses and review their profiles', cost: 'Free' },
      { name: 'Google Business Profile Manager', purpose: 'Edit client profiles once you have manager access', cost: 'Free' },
      { name: 'Google Sheets', purpose: 'Track prospects, audits and follow-ups', cost: 'Free' },
      { name: 'Canva', purpose: 'Design one-page audit reports and profile photos', cost: 'Free' },
      { name: 'Google Docs', purpose: 'Write proposals, descriptions and monthly reports', cost: 'Free' },
      { name: 'Loom', purpose: 'Record short audit walkthroughs for owners', cost: 'Free' },
    ],
  },
}

export const pathList: PathInfo[] = [paths.clipping, paths.gbp]
