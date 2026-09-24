import type { Resource } from './types'

/** Resource library. ALL DATA IS FICTITIOUS. */
export const resources: Resource[] = [
  {
    id: 'res-cold-outreach',
    title: 'Cold Outreach Template',
    type: 'Template',
    path: 'all',
    description:
      'A short, specific first message that works over DM or email. Swap the bracketed parts and keep it under 90 words.',
    minutes: 4,
    sections: [
      {
        heading: 'The first message',
        body: [
          'Hi [first name] — I just went through [specific video / profile / page] and [one genuine, specific observation].',
          'I noticed [the gap: e.g. "your long episodes are not being cut into shorts" / "your Google profile is missing photos and services"].',
          'I help [type of person or business] get [result] by [your service]. I put together [a free sample / a 3-point audit] for you so you can see what I mean.',
          'Want me to send it over? No strings attached.',
          '— [your name]',
        ],
      },
      {
        heading: 'Subject lines (email only)',
        body: [
          'Quick idea for [business or channel name]',
          '[First name], made something for you',
          'Noticed this on your [channel / Google profile]',
        ],
      },
      {
        heading: 'Rules before you hit send',
        body: [
          'The first sentence must prove you actually looked at their work — no generic compliments.',
          'One ask only. Do not mention price, packages, or a call in the first message.',
          'Read it out loud. If it sounds like an ad, rewrite it like a text to a colleague.',
        ],
      },
    ],
  },
  {
    id: 'res-discovery-questions',
    title: 'Client Discovery Questions',
    type: 'Script',
    path: 'all',
    description:
      'A 15-minute call script built around questions. Ask, listen, take notes — the prospect will tell you exactly what to put in the proposal.',
    minutes: 6,
    sections: [
      {
        heading: 'Open (2 minutes)',
        body: [
          '"Thanks for making time, [name]. I have about 15 minutes of questions so I can see whether I can actually help — sound good?"',
          '"To start, tell me a bit about [the business / the channel] and where it is right now."',
        ],
      },
      {
        heading: 'Problem and goal (8 minutes)',
        body: [
          '"What made you reply to my message?"',
          '"What have you already tried for [short-form content / getting found on Google]? How did that go?"',
          '"If this was working perfectly three months from now, what would be different?"',
          '"What happens if it stays the way it is for the next six months?"',
          '"Roughly what is a new [client / subscriber / customer] worth to you?"',
        ],
      },
      {
        heading: 'Logistics (3 minutes)',
        body: [
          '"Besides you, is anyone else involved in deciding on something like this?"',
          '"Do you have a budget range in mind, or would it help if I suggested a couple of options?"',
          '"If it looks like a fit, when would you want to start?"',
        ],
      },
      {
        heading: 'Close (2 minutes)',
        body: [
          '"Here is what I heard: [repeat their goal and main problem in their words]. Did I get that right?"',
          '"I will send a short proposal by [day]. Can we agree you will give me a yes or no by [day + 3]?"',
        ],
      },
    ],
  },
  {
    id: 'res-pricing-calculator',
    title: 'Pricing Calculator',
    type: 'Calculator',
    path: 'all',
    description:
      'Work out a floor price, a target price, and three packages from your hours and costs — so you never quote a number you will regret.',
    minutes: 5,
    link: '/pricing',
    sections: [
      {
        heading: 'What to enter',
        body: [
          'Hours per deliverable: be honest and include revisions and client messages, not just the hands-on work.',
          'Minimum hourly rate: the lowest figure that makes the work worth doing for you.',
          'Monthly tool costs: editing software, caption tools, reporting tools, and so on.',
        ],
      },
      {
        heading: 'How to read the result',
        body: [
          'Floor price is your walk-away number. Never go below it, even for a first client.',
          'Target price is what you quote by default. It includes a margin for the unexpected.',
          'The three packages are built around the target so the middle option is the natural choice.',
        ],
      },
      {
        heading: 'Tips',
        body: [
          'Re-run the calculator after every project with your real hours — most beginners underestimate by 30–50%.',
          'Raise your target price after every third client until you start hearing "no" about a third of the time.',
        ],
      },
    ],
  },
  {
    id: 'res-proposal-template',
    title: 'Proposal Template',
    type: 'Template',
    path: 'all',
    description:
      'A one-page proposal you can send as a message, doc, or PDF. Short enough to read on a phone, clear enough to say yes to.',
    minutes: 8,
    sections: [
      {
        heading: 'Summary',
        body: [
          'Proposal for [client / business name] — prepared by [your name], [date]',
          'Where you are now: [1–2 sentences using the words they used on the call].',
          'Where you want to be: [their goal, with a number if they gave one].',
          'How I will help: [your service in one sentence].',
        ],
      },
      {
        heading: 'Scope and timeline',
        body: [
          'What is included: [deliverable 1], [deliverable 2], [deliverable 3].',
          'What is not included: [e.g. posting to platforms, paid ads, website changes].',
          'Timeline: work starts on [date]; first delivery by [date]; project complete by [date].',
          'Revisions: [number] rounds included, requested within [number] days of delivery.',
        ],
      },
      {
        heading: 'Investment',
        body: [
          'Option A — [Starter name]: [scope] — $[price]',
          'Option B — [Standard name] (recommended): [scope] — $[price]',
          'Option C — [Premium name]: [scope] — $[price]',
          'Payment: [50% upfront, 50% on delivery / 100% upfront for projects under $300].',
        ],
      },
      {
        heading: 'Next step',
        body: [
          'To go ahead, reply with the option you want and I will send the invoice and onboarding checklist the same day.',
          'This proposal is valid until [date].',
        ],
      },
    ],
  },
  {
    id: 'res-follow-up-script',
    title: 'Follow-Up Script',
    type: 'Script',
    path: 'all',
    description:
      'Three follow-ups on a 3-7-14 day rhythm. Each one adds something new so you never have to write "just checking in".',
    minutes: 4,
    sections: [
      {
        heading: 'Day 3 — add value',
        body: [
          'Hi [first name], following up on my note from [day].',
          'I went ahead and [made a short sample / wrote down 3 quick fixes] for [business or channel name] — [link or attached].',
          'Happy to explain any of it if useful.',
        ],
      },
      {
        heading: 'Day 7 — a new angle',
        body: [
          'Hi [first name], one more thought: [specific observation, e.g. "your competitor two streets over has 4x the photos" / "your episode with [guest] has three moments that would work as shorts"].',
          'If it would help, I can show you what I would do in a 10-minute call this week. Does [day] or [day] work?',
        ],
      },
      {
        heading: 'Day 14 — close the loop',
        body: [
          'Hi [first name], I do not want to clutter your inbox, so this is my last note for now.',
          'If [the result] becomes a priority later, just reply to this message and I will pick it back up.',
          'Either way, good luck with [something specific they are working on].',
        ],
      },
    ],
  },
  {
    id: 'res-client-onboarding',
    title: 'Client Onboarding Checklist',
    type: 'Checklist',
    path: 'all',
    description:
      'Everything to collect and confirm in the first 24 hours after a client says yes, so the project starts clean.',
    minutes: 5,
    sections: [
      {
        heading: 'Before you start',
        body: [
          'Proposal option confirmed in writing',
          'Invoice sent and first payment received',
          'Start date, delivery date, and revision rounds confirmed',
          'One main point of contact and preferred channel agreed',
        ],
      },
      {
        heading: 'Access and assets',
        body: [
          'Access granted to what you need (raw footage folder / manager access to the Google Business Profile)',
          'Brand assets received: logo, fonts, colours, example content they like',
          'List of things to avoid: topics, words, competitors, styles',
          'Shared folder created with a clear structure: Inputs, Drafts, Final',
        ],
      },
      {
        heading: 'Kickoff message',
        body: [
          'Welcome message sent with timeline and what happens next',
          'Mid-project update date added to your calendar',
          'Baseline numbers recorded (current views, calls, profile views) for the results recap',
        ],
      },
    ],
  },
  {
    id: 'res-content-research',
    title: 'Content Research Checklist',
    type: 'Checklist',
    path: 'clipping',
    description:
      'Run through this before pitching or clipping for a creator, so you know their content well enough to pick moments that land.',
    minutes: 6,
    sections: [
      {
        heading: 'Know the creator',
        body: [
          'Watched at least 2 full long-form videos or episodes',
          'Noted their niche, audience, and the 3 topics they return to most',
          'Checked which platforms they already post shorts on, and how often',
          'Identified their 3 best-performing shorts and what those have in common',
        ],
      },
      {
        heading: 'Find clip-worthy moments',
        body: [
          'Strong opinion or contrarian statement',
          'A story with a clear setup and payoff under 45 seconds',
          'A specific number, result, or before/after',
          'A how-to step that makes sense without the rest of the video',
          'An emotional or funny reaction',
        ],
      },
      {
        heading: 'Log it',
        body: [
          'Timestamped at least 5 candidate moments per video',
          'Rated each moment 1–3 for hook strength',
          'Wrote a draft on-screen hook line for the top 3',
        ],
      },
    ],
  },
  {
    id: 'res-prospect-tracker',
    title: 'Prospect Tracker',
    type: 'Tool',
    path: 'all',
    description:
      'Your built-in pipeline: every prospect, their status, your notes, and the next follow-up date in one place.',
    minutes: 3,
    link: '/prospects',
    sections: [
      {
        heading: 'How to use it daily',
        body: [
          'Add every prospect the moment you find them — even before you message them.',
          'Move the status as soon as something happens: New → Contacted → Replied → Interested → Negotiating → Won or Lost.',
          'Set a follow-up date every time you send a message. Start each day by clearing the follow-ups that are due.',
        ],
      },
      {
        heading: 'What to write in notes',
        body: [
          'The specific detail you used to personalise your message.',
          'Anything they told you about their goals, budget, or timing.',
          'For lost deals: the reason, tagged as Timing, Budget, Fit, or Message.',
        ],
      },
      {
        heading: 'Weekly review',
        body: [
          'Check your reply rate (replies ÷ contacted). Under 5% means the message needs work; over 15% means send more.',
          'Re-open anything marked Lost for "timing" after 60 days.',
        ],
      },
    ],
  },
  {
    id: 'res-portfolio-guide',
    title: 'Build a Portfolio With Zero Clients',
    type: 'Guide',
    path: 'clipping',
    description:
      'Make 6 sample clips in a weekend that prove you can do the job — without having been hired yet.',
    minutes: 10,
    sections: [
      {
        heading: 'Pick the right source material',
        body: [
          'Choose 2–3 creators in the niche you want to work in, ideally ones who publish long-form content and post few or no shorts. Their back catalogue is your practice ground.',
          'Make 2 clips per creator. That gives you 6 samples and shows you can adapt to different voices and styles.',
        ],
      },
      {
        heading: 'Make each sample count',
        body: [
          'Treat every sample as paid work: a strong hook in the first 2 seconds, accurate captions, tight cuts, vertical framing that keeps the speaker centred.',
          'Keep clips between 20 and 45 seconds. Shorter samples get watched to the end, which is what a busy creator will do with them.',
          'Always label samples clearly as spec work — "Sample edit, not commissioned" — and never post them publicly as if the creator hired you.',
        ],
      },
      {
        heading: 'Present it simply',
        body: [
          'Put the clips in one shared folder or a single unlisted page with a one-line description under each: the source, the hook you chose, and why.',
          'Your best sample for a given creator doubles as your pitch: "I made this from your latest episode" is the strongest first message you can send.',
        ],
      },
    ],
  },
  {
    id: 'res-clipping-toolkit',
    title: 'The Clipping Toolkit',
    type: 'Tool',
    path: 'clipping',
    description:
      'The lean set of tools you need to find, cut, caption, and deliver clips — with a free option for every step.',
    minutes: 7,
    sections: [
      {
        heading: 'Editing',
        body: [
          'A free desktop editor with vertical timelines and auto-captions covers 95% of clipping work. Pick one and learn its shortcuts rather than hopping between apps.',
          'A mobile editor is handy for quick fixes and caption tweaks, but do your main edits on a larger screen.',
        ],
      },
      {
        heading: 'Finding moments faster',
        body: [
          'Use auto-generated transcripts to skim a 60-minute episode in 10 minutes. Search for phrases like "the truth is", "most people", "here is what happened".',
          'AI highlight tools can suggest moments, but treat them as a first pass — always pick the final hook yourself.',
        ],
      },
      {
        heading: 'Delivery and organisation',
        body: [
          'One shared cloud folder per client with Inputs, Drafts, and Final subfolders.',
          'File naming: [client]_[episode]_[clip number]_[v1]. It saves hours once you have more than one client.',
          'Export at 1080×1920, 30 fps, high bitrate. Deliver a version with captions burned in unless the client asks otherwise.',
        ],
      },
    ],
  },
  {
    id: 'res-hook-checklist',
    title: 'Viral Hook Checklist',
    type: 'Checklist',
    path: 'clipping',
    description: 'Check every clip against this list before you export. The first two seconds decide everything.',
    minutes: 3,
    sections: [
      {
        heading: 'First 2 seconds',
        body: [
          'Clip starts mid-thought — no "so", "um", or intro',
          'On-screen hook text is 8 words or fewer',
          'The hook creates a question the viewer wants answered',
          'There is movement or a visual change in the first second',
          'Speaker face is clearly visible and centred',
        ],
      },
      {
        heading: 'Body',
        body: [
          'A cut, zoom, or caption change at least every 3–4 seconds',
          'Every pause longer than half a second is removed',
          'Captions are accurate, 2–4 words at a time, inside the safe zone',
          'Key words are emphasised with colour or size — sparingly',
        ],
      },
      {
        heading: 'Ending',
        body: [
          'The payoff promised by the hook is actually delivered',
          'Clip ends right after the payoff — no trailing sentences',
          'Total length is 20–45 seconds unless the story needs more',
        ],
      },
    ],
  },
  {
    id: 'res-editing-workflow',
    title: '60-Minute Editing Workflow',
    type: 'Guide',
    path: 'clipping',
    description:
      'A timed, repeatable process for turning one long video into three finished clips in an hour.',
    minutes: 8,
    sections: [
      {
        heading: 'Minutes 0–15: Find the moments',
        body: [
          'Skim the transcript, not the video. Mark every line that is an opinion, a number, a story, or a clear how-to step.',
          'Shortlist five moments, then pick the three with the strongest opening line. Note the in and out timestamps.',
        ],
      },
      {
        heading: 'Minutes 15–45: Cut and caption',
        body: [
          'Spend about 10 minutes per clip. Rough cut first: trim to the moment, remove pauses and filler, reframe to vertical.',
          'Then add auto-captions and fix every error — names and niche terms are usually wrong. Add the on-screen hook line last.',
        ],
      },
      {
        heading: 'Minutes 45–60: Polish and export',
        body: [
          'Watch each clip once with sound off (do the captions carry it?) and once at normal speed (any awkward cuts?).',
          'Run the Viral Hook Checklist, export, name the files properly, and upload to the client folder with a short delivery note.',
        ],
      },
    ],
  },
  {
    id: 'res-revision-policy',
    title: 'Revision Policy Template',
    type: 'Template',
    path: 'all',
    description:
      'A friendly, firm paragraph to paste into proposals and kickoff messages so revisions never spiral.',
    minutes: 3,
    sections: [
      {
        heading: 'The policy',
        body: [
          'Each deliverable includes [2] rounds of revisions.',
          'Please send all feedback for a round in a single message within [3] business days of delivery, so I can make every change at once.',
          'A revision is an adjustment to the agreed work (e.g. [caption fix, trim, wording change / photo swap, description edit]). New requests outside the original scope are quoted separately.',
          'Additional revision rounds are available at $[price] per round.',
          'If I do not receive feedback within [7] days, the deliverable is considered approved.',
        ],
      },
      {
        heading: 'When a request goes beyond scope',
        body: [
          'Hi [name], happy to do that! It is outside what we agreed for this project, so it would be an extra $[price] and ready by [date].',
          'Want me to add it, or shall we keep to the original plan for now?',
        ],
      },
    ],
  },
  {
    id: 'res-retainer-pitch',
    title: 'Monthly Retainer Pitch',
    type: 'Script',
    path: 'all',
    description:
      'Send this right after a successful delivery to turn a one-off project into predictable monthly income.',
    minutes: 4,
    sections: [
      {
        heading: 'Results recap (send within 48 hours of delivery)',
        body: [
          'Hi [name], quick recap of what we did: [deliverables].',
          'Early results: [specific number, e.g. "the three clips reached 18,400 views in 5 days" / "profile views are up 27% and you got 9 more calls than last month"].',
          'What I would do next: [one clear recommendation].',
        ],
      },
      {
        heading: 'The pitch',
        body: [
          'Results like this compound when the work is consistent, so I would like to suggest a monthly plan.',
          'Each month you would get: [deliverable count, e.g. "12 clips" / "4 Google posts, review replies, and a performance report"].',
          'That is $[price] per month — [lower per-unit cost than the one-off / includes priority turnaround].',
          'We would start with 3 months, and you can cancel any time with 14 days notice. Want me to set it up from [date]?',
        ],
      },
      {
        heading: 'If they hesitate',
        body: [
          '"Totally fair. Would a smaller plan at $[lower price] for [reduced scope] be an easier place to start?"',
          '"No problem — I will check back in [2 weeks] with updated numbers so you can decide with more data."',
        ],
      },
    ],
  },
  {
    id: 'res-objection-script',
    title: 'Objection Handling Script',
    type: 'Script',
    path: 'all',
    description:
      'Calm, word-for-word responses to the five objections beginners hear most. Always acknowledge first, then ask, then answer.',
    minutes: 6,
    sections: [
      {
        heading: '"It is too expensive"',
        body: [
          '"I hear you. Can I ask — too expensive compared to what, or is it more that the budget is not there right now?"',
          '"If budget is the issue, I can do [smaller scope] for $[lower price]. Same quality, just less of it."',
          '"For context, you said a new [customer / sponsor] is worth around $[value]. This needs to bring in [number] to pay for itself."',
        ],
      },
      {
        heading: '"I need to think about it"',
        body: [
          '"Of course. What is the main thing you want to think through? I might be able to help right now."',
          '"Shall I check in on [specific day]? I will hold the start date until then."',
        ],
      },
      {
        heading: '"I can do this myself" / "My [nephew / assistant] does it"',
        body: [
          '"You absolutely could. The question is whether it is the best use of your time — how many hours a week has it been getting lately?"',
          '"Happy to work alongside them. I can handle [the part they are not doing] and hand over a simple process."',
        ],
      },
      {
        heading: '"You do not have much experience"',
        body: [
          '"That is fair — I am early on, which is exactly why my rate is where it is and why you would get far more attention than from a big agency."',
          '"How about a small paid trial: [one deliverable] for $[price]. If you do not like it, we stop there."',
        ],
      },
    ],
  },
  {
    id: 'res-gbp-audit-template',
    title: 'Google Business Profile Audit Template',
    type: 'Template',
    path: 'gbp',
    description:
      'A one-page audit you can fill in within 15 minutes and send to a local business owner as your foot in the door.',
    minutes: 12,
    sections: [
      {
        heading: 'Snapshot',
        body: [
          'Google Business Profile audit for [business name], [city] — prepared by [your name], [date]',
          'Primary category: [category] — [correct / should be changed to X]',
          'Rating: [x.x] stars from [number] reviews. Top local competitor: [name], [x.x] stars from [number] reviews.',
          'Search checked: "[service] in [city]" — you appear at position [number] in the map results.',
        ],
      },
      {
        heading: 'What I found',
        body: [
          'Profile completeness: [missing hours / services / description / attributes].',
          'Photos: [number] photos, most recent added [date]. Competitors average [number].',
          'Reviews: [number] of the last 10 reviews have no owner reply. Last review received [date].',
          'Posts: [no posts in the last X months / none ever].',
          'Accuracy: [phone, address, or website link issue, if any].',
        ],
      },
      {
        heading: 'Top 3 fixes and what they are worth',
        body: [
          'Fix 1: [highest-impact problem] — [what I would do] — expected effect: [e.g. more calls from map searches].',
          'Fix 2: [second problem] — [what I would do].',
          'Fix 3: [third problem] — [what I would do].',
          'I can take care of all three in [number] days for $[price]. Want me to walk you through it in 10 minutes?',
        ],
      },
    ],
  },
  {
    id: 'res-gbp-optimization-checklist',
    title: 'Profile Optimization Checklist',
    type: 'Checklist',
    path: 'gbp',
    description:
      'The full list of fixes to work through when a business hires you to optimise their Google Business Profile.',
    minutes: 8,
    sections: [
      {
        heading: 'Core information',
        body: [
          'Business name matches real-world signage exactly (no keyword stuffing)',
          'Primary category is the most specific one available; 2–4 relevant secondary categories added',
          'Address or service area is correct and consistent with the website',
          'Phone number, website link, and booking link tested and working',
          'Regular hours and upcoming holiday hours set',
        ],
      },
      {
        heading: 'Content',
        body: [
          'Description written: 750 characters, services and city mentioned naturally in the first two sentences',
          'Every service listed with a short description and price where possible',
          'Attributes completed (payment methods, accessibility, parking, etc.)',
          'At least 15 recent photos: exterior, interior, team, work in progress, finished results',
          'Logo and cover photo set, correctly cropped',
        ],
      },
      {
        heading: 'Trust and activity',
        body: [
          'All reviews from the last 12 months have an owner reply',
          'Review request link created and shared with the owner',
          'First Google post published; posting schedule agreed (weekly is ideal)',
          'Five common customer questions added and answered in Q&A',
          'Baseline metrics recorded: calls, direction requests, website clicks, profile views',
        ],
      },
    ],
  },
  {
    id: 'res-local-prospecting-guide',
    title: 'Local Prospecting Guide',
    type: 'Guide',
    path: 'gbp',
    description:
      'How to find local businesses with a weak Google profile and a real reason to fix it — in about 20 minutes per batch of ten.',
    minutes: 9,
    sections: [
      {
        heading: 'Choose where to look',
        body: [
          'Start with categories where one new customer is worth a lot and owners are busy: dentists, plumbers, roofers, auto repair, med spas, physiotherapists, law firms, landscapers.',
          'Search "[category] in [town]" on Google Maps. Skip the top three results — they are usually doing fine. Your prospects live at positions 4 to 15.',
        ],
      },
      {
        heading: 'Spot a good prospect in 60 seconds',
        body: [
          'Look for at least two of: fewer than 40 reviews, rating below 4.4, no owner replies, fewer than 10 photos, missing hours or services, no posts.',
          'Then check they are a real, active business: a working website or social page, recent reviews, and a phone number that matches. Avoid chains and franchises — the local manager rarely controls the profile.',
        ],
      },
      {
        heading: 'Reach the owner',
        body: [
          'Email found on the website works best, followed by a DM to their business page. For trades, a short phone call mid-morning often beats both.',
          'Lead with one specific finding and offer the full audit for free. Add every prospect to your tracker with the problems you spotted so your message writes itself.',
        ],
      },
    ],
  },
  {
    id: 'res-review-request-script',
    title: 'Review Request Script',
    type: 'Script',
    path: 'gbp',
    description:
      'Messages your client can send to happy customers to get more Google reviews — plus a reply template for the reviews that come in.',
    minutes: 4,
    sections: [
      {
        heading: 'Text or WhatsApp (send within 24 hours of the job)',
        body: [
          'Hi [customer name], it is [owner name] from [business name]. Thanks again for choosing us for [service]!',
          'If you were happy with the work, would you mind leaving us a quick Google review? It takes under a minute and really helps a small business like ours: [review link]',
          'Thank you — it means a lot.',
        ],
      },
      {
        heading: 'In person (for staff)',
        body: [
          '"Glad you are happy with it! We are trying to grow our Google reviews — if I text you the link, would you be up for leaving a quick one?"',
        ],
      },
      {
        heading: 'Replying to reviews',
        body: [
          'Positive: "Thank you, [name]! We loved helping with [specific service]. See you next time — [owner name]"',
          'Negative: "Hi [name], I am sorry to hear this. It is not the experience we aim for. Please call me directly on [phone] so I can put it right — [owner name]"',
          'Never offer discounts or gifts in exchange for reviews — it breaks Google policy and can get reviews removed.',
        ],
      },
    ],
  },
  {
    id: 'res-gbp-report-template',
    title: 'Monthly Performance Report Template',
    type: 'Template',
    path: 'gbp',
    description:
      'A one-page monthly report that shows a local business owner what you did and what it achieved — the backbone of any retainer.',
    minutes: 7,
    sections: [
      {
        heading: 'Headline numbers',
        body: [
          '[Business name] — Google Business Profile report for [month year]',
          'Calls from profile: [number] ([+/- %] vs last month)',
          'Direction requests: [number] ([+/- %])',
          'Website clicks: [number] ([+/- %])',
          'Profile views: [number] ([+/- %])',
          'Reviews: [number] new, average rating now [x.x] from [total] reviews',
        ],
      },
      {
        heading: 'What I did this month',
        body: [
          'Published [number] Google posts: [topics].',
          'Replied to [number] reviews within [48] hours.',
          'Added [number] new photos: [what they show].',
          'Updates made: [hours, services, Q&A, or other changes].',
        ],
      },
      {
        heading: 'Insight and next month',
        body: [
          'What stood out: [one plain-English observation, e.g. "searches for emergency plumber doubled after we added it as a service"].',
          'Plan for [next month]: [priority 1], [priority 2], [priority 3].',
          'One thing I need from you: [e.g. "5 photos of recent jobs" / "send the review link to this week\'s customers"].',
        ],
      },
    ],
  },
  {
    id: 'res-daily-focus-planner',
    title: 'Daily Focus Planner',
    type: 'Tool',
    path: 'all',
    description:
      'A two-minute planning routine that turns your available time into one to three focused action blocks.',
    minutes: 2,
    sections: [
      {
        heading: 'Plan the day in 2 minutes',
        body: [
          'Write today\'s mission at the top. That is block one — always.',
          'Add up to two more blocks, each named with a verb and a number: "Send 5 follow-ups", "Edit 2 clips", "Audit 3 profiles".',
          'Give each block 25 minutes and a start time. If you only have 30 minutes today, plan one block and do it well.',
        ],
      },
      {
        heading: 'During a block',
        body: [
          'Phone out of reach, notifications off, only the tabs you need.',
          'If a new idea or task pops up, write it on a "later" list and keep going.',
        ],
      },
      {
        heading: 'Close the day',
        body: [
          'Tick off what got done and log your numbers: prospects added, messages sent, follow-ups done.',
          'Write one line on where to start tomorrow. Future you will thank you.',
        ],
      },
    ],
  },
  {
    id: 'res-invoice-template',
    title: 'Simple Invoice Template',
    type: 'Template',
    path: 'all',
    description:
      'A clean invoice with everything a client needs to pay you quickly — and nothing they do not.',
    minutes: 4,
    sections: [
      {
        heading: 'Header',
        body: [
          'INVOICE #[001]',
          'From: [your full name], [your email], [your city and country]',
          'To: [client name], [business name], [client email]',
          'Issue date: [date] — Due date: [date, 7 days later]',
        ],
      },
      {
        heading: 'Line items',
        body: [
          '[Service description, e.g. "12 short-form clips from Episodes 41–44" / "Google Business Profile optimisation"] — [quantity] × $[unit price] = $[amount]',
          '[Optional second item] — $[amount]',
          'Subtotal: $[amount]',
          'Deposit already paid: –$[amount]',
          'Total due: $[amount]',
        ],
      },
      {
        heading: 'Payment details and terms',
        body: [
          'Pay by: [payment method and details or link].',
          'Payment is due within 7 days of the issue date. Work on the next phase starts once payment is received.',
          'Thank you for your business, [client first name]!',
        ],
      },
    ],
  },
  {
    id: 'res-testimonial-request',
    title: 'Testimonial Request Message',
    type: 'Script',
    path: 'all',
    description:
      'Ask for a testimonial in a way that is easy to say yes to — three guided questions instead of a blank page.',
    minutes: 3,
    sections: [
      {
        heading: 'The ask (send right after a win)',
        body: [
          'Hi [name], really glad [specific result, e.g. "the clips are performing" / "the calls are picking up"]!',
          'Would you be open to sharing a short testimonial I can show future clients? To make it easy, just answer these three in a sentence or two each:',
          '1. What was the situation before we started working together?',
          '2. What changed or improved?',
          '3. Who would you recommend this to?',
          'A reply to this message is perfect — I will tidy it up and send it back for your approval before using it.',
        ],
      },
      {
        heading: 'Approval follow-up',
        body: [
          'Thanks so much, [name]! Here is the version I would use: "[edited testimonial]" — [their name], [business or channel].',
          'Are you happy for me to share this with your name and [logo / profile photo]?',
        ],
      },
    ],
  },
  {
    id: 'res-upsell-guide',
    title: 'The Upsell Playbook',
    type: 'Guide',
    path: 'all',
    description:
      'Practical ways to grow the value of each client without feeling pushy — when to offer more, what to offer, and how to say it.',
    minutes: 9,
    sections: [
      {
        heading: 'Timing is everything',
        body: [
          'Offer more only after a visible win: a clip that outperformed their average, a jump in calls, a run of new reviews. The result does the selling for you.',
          'Never upsell while a delivery is late or a complaint is open. Fix first, then wait for the next win.',
        ],
      },
      {
        heading: 'What to offer',
        body: [
          'Clipping: more clips per month, a second platform format, thumbnail and title suggestions, scheduling and posting, a monthly performance summary.',
          'Google Business Profiles: weekly posts, review reply management, a review-generation campaign, monthly photo refreshes, profiles for additional locations.',
          'Pick add-ons that reuse work you already do. The best upsell adds 20% more effort for 50% more revenue.',
        ],
      },
      {
        heading: 'How to say it',
        body: [
          'Frame it as a recommendation, not a sale: "Based on what worked this month, the next thing I would do is [add-on]. It would be $[price] extra per month — want me to include it from [date]?"',
          'Give one option, not a menu. If they say no, thank them and bring it up again only when new results justify it.',
        ],
      },
    ],
  },
  {
    id: 'res-outreach-generator',
    title: 'Outreach Message Generator',
    type: 'Tool',
    path: 'all',
    description:
      'Pick a prospect, a stage, and a tone — and get a personalised draft message you can edit and send in under a minute.',
    minutes: 3,
    link: '/outreach/generate',
    sections: [
      {
        heading: 'How to use it',
        body: [
          'Choose a prospect from your tracker so the generator can pull in their name, platform, and your notes.',
          'Select the stage: first touch, follow-up, reply, or closing.',
          'Add one specific detail about them. This is the single biggest driver of reply rates, so do not skip it.',
        ],
      },
      {
        heading: 'Before you send',
        body: [
          'Always edit the draft so it sounds like you. Change at least one sentence.',
          'Cut anything that is not needed — shorter messages get more replies.',
          'Copy the message, send it on the right platform, then log it so the prospect moves to Contacted and a follow-up date is set.',
        ],
      },
    ],
  },
]
