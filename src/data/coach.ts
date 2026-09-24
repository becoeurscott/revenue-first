import type { ChatMessage, CoachConversation, CoachReply, PathId } from './types'
import { daysAgo, hoursAgo } from '@/lib/date'

/** AI Coach mock content. ALL DATA IS FICTITIOUS. Less theory. More action. */

export const suggestedPrompts: Record<PathId, string[]> = {
  clipping: [
    'How do I find clients?',
    'What should I charge?',
    'Help me write an outreach message.',
    'A client rejected me.',
    'What should I do today?',
    'How do I handle this objection?',
  ],
  gbp: [
    'How do I find local businesses to contact?',
    'What should I charge?',
    'Help me write an outreach message.',
    'A business owner rejected me.',
    'What should I do today?',
    'How do I handle this objection?',
  ],
}

/**
 * Canned replies, matched by lowercase keywords against the user's message.
 * More specific topics come first so they win over broad ones.
 */
export const coachReplies: CoachReply[] = [
  {
    id: 'r-objection',
    keywords: ['objection', 'too expensive', 'expensive', 'already have an editor', 'have an editor', 'already have someone', 'more info', 'send me info', 'think about it', 'no budget'],
    text: {
      clipping:
        'An objection means they are still talking to you. Answer in two lines, then ask a question.\n\n1. "Too expensive": "Totally fair. Want to start with 3 clips for $90 and see how they perform?"\n2. "I already have an editor": "Great. Most editors hate clipping. I can handle only the Shorts so they can focus on the long videos."\n3. "Send me more info": never send a PDF. Send one sample clip and one price, then ask "Want me to start with this week\'s episode?"\n\nNext step: paste the exact objection here and I will write your reply.',
      gbp:
        'An objection means they are still talking to you. Answer in two lines, then ask a question.\n\n1. "Too expensive": "Fair. One new customer a month covers it. Want to start with the audit and core fixes for $200?"\n2. "My nephew handles our Google page": "Perfect. I will send him the audit so he has a checklist. Want it?"\n3. "Send me more info": skip the brochure. Send a screenshot of their profile next to the top competitor with 3 fixes circled.\n\nNext step: paste the exact objection here and I will write your reply.',
    },
    followUps: ['They said it is too expensive.', 'They asked for more info.', 'They already have someone.'],
  },
  {
    id: 'r-followup',
    keywords: ['follow up', 'follow-up', 'followup', 'following up', 'second message', 'remind'],
    text: {
      all:
        'Most deals happen in the follow-up, not the first message. Use this rhythm:\n\n1. Day 3: a short bump. "Hey, did you get a chance to look at this?"\n2. Day 7: add new value. A fresh sample, a screenshot, or one specific idea.\n3. Day 14: the polite close. "I will assume the timing is off. Can I check back next month?"\n\nKeep every follow-up under 40 words and never apologize for following up. After three with no answer, mark them Lost and move on.\n\nNext step: open Prospects, filter by Contacted, and send the Day 3 bump to everyone waiting more than three days.',
    },
    followUps: ['Write the Day 3 bump for me.', 'How many follow-ups is too many?'],
  },
  {
    id: 'r-no-replies',
    keywords: ['no replies', 'no reply', 'no response', 'nobody replies', 'no one replies', 'ignored', 'ghosted', 'not answering', 'not responding'],
    text: {
      clipping:
        'No replies is a data problem, not a you problem. Check three things:\n\n1. Volume. Fewer than 20 messages sent? You do not have a result yet. Send more.\n2. First line. If it starts with "I" or your service, rewrite it to mention one specific moment from their latest video.\n3. Proof. Attach a 20-second sample clip cut from their own content. It doubles reply rates.\n\nAlso check the channel: many creators never open DMs, so try the business email in their bio.\n\nNext step: send 5 new messages today using a sample clip, then tell me how many replies you get in 48 hours.',
      gbp:
        'No replies is a data problem, not a you problem. Check three things:\n\n1. Volume. Fewer than 20 businesses contacted? You do not have a result yet.\n2. First line. Mention one specific problem: "Your profile shows you as closed on Saturdays, but your website says open."\n3. Channel. Owners ignore contact forms. Call between 2 and 4 pm, or walk in with a one-page printed audit.\n\nOne screenshot of their profile next to a competitor beats any paragraph you can write.\n\nNext step: pick 5 businesses today, find one visible problem for each, and contact them by phone or in person.',
    },
    followUps: ['Review my first message.', 'How many messages should I send a day?', 'Should I follow up?'],
  },
  {
    id: 'r-rejection',
    keywords: ['rejected', 'rejection', 'said no', 'turned me down', 'not interested', 'declined', 'they passed'],
    text: {
      all:
        'A no stings, and it is also normal. Expect around 9 out of 10 people to pass, even when your offer is good. A no usually means "not now", not "you are bad at this".\n\nDo three things:\n\n1. Reply kindly: "No problem at all. Mind if I check back in a couple of months?"\n2. Ask one question: "Was it price, timing, or fit?" The answer improves your next pitch.\n3. Mark them Lost and set a reminder for 60 days.\n\nThen replace them right away. Your pipeline should never depend on one person.\n\nNext step: add two new prospects to your list before you close the app today.',
    },
    followUps: ['Write a polite reply to the rejection.', 'How do I stop taking it personally?'],
  },
  {
    id: 'r-closing',
    keywords: ['close', 'closing', 'ask for payment', 'payment', 'invoice', 'get paid', 'deposit', 'upfront', 'contract'],
    text: {
      all:
        'When they show interest, do not keep explaining. Close with a clear, simple step.\n\n1. Summarize in one line: what they get, by when, for how much.\n2. Ask directly: "Want me to get started this week?"\n3. When they say yes, send a payment link within the hour. Ask for 50% upfront, or 100% for anything under $200.\n4. Confirm in writing: scope, deadline, two rounds of revisions.\n\nYou do not need a long contract for a first small project. A clear message they reply "agreed" to is enough.\n\nNext step: send your warmest prospect the one-line summary and the question from step 2 today.',
    },
    followUps: ['Write the closing message for me.', 'What if they want to pay after delivery?'],
  },
  {
    id: 'r-retainer',
    keywords: ['retainer', 'upsell', 'monthly', 'recurring', 'repeat', 'long-term', 'long term', 'keep the client'],
    text: {
      clipping:
        'The best time to pitch a retainer is right after you deliver and they are happy.\n\n1. Deliver on time, then share one result: "Clip 3 already has 4,200 views."\n2. Make the offer simple: "Want me to do this every month? 10 clips for $250, delivered weekly."\n3. Give a reason to decide now: hold the price for clients who start this month.\n\nPrice the retainer slightly below your one-off rate. Predictable income is worth the discount.\n\nNext step: message your current client today with one result and the monthly offer.',
      gbp:
        'The best time to pitch a retainer is right after the fixes go live and they can see the change.\n\n1. Send a before and after: photos, categories, and review replies.\n2. Make the offer simple: "Want me to keep this up? 4 posts, all review replies and a monthly report for $150 a month."\n3. Tie it to money: one extra customer a month pays for it.\n\nKeep the retainer small and easy to say yes to. You can raise it after three months of results.\n\nNext step: send your current client the before and after with the monthly offer today.',
    },
    followUps: ['Write the retainer pitch for me.', 'How much should a retainer cost?'],
  },
  {
    id: 'r-pricing',
    keywords: ['charge', 'price', 'pricing', 'rates', 'my rate', 'how much', 'quote', '50k', 'cost'],
    text: {
      clipping:
        "Start by understanding what they're asking for, then quote a pack, not an hourly rate. For a creator with around 50K followers, a starter pack works best:\n\n1. 5 clips with captions and a strong hook: $150–$250.\n2. Two rounds of revisions included.\n3. Delivery in 5 to 7 days.\n\nAs a beginner, quote $150 to $180 to get the yes and the testimonial, then raise it for client two. Never price per clip. It invites haggling.\n\nNext step: open the Pricing Calculator, enter their details, and send one clear price today.",
      gbp:
        "Start by understanding what they're asking for, then quote a fixed project, not an hourly rate. For a single-location business, a good starter offer is:\n\n1. Full profile audit plus core fixes: $200–$400.\n2. Categories, services, photos, hours and review replies included.\n3. Done in 5 to 7 days.\n\nAs a beginner, quote $200 to $250 for your first client, then raise it once you have a before and after to show. Anchor the price to what one new customer is worth to them.\n\nNext step: open the Pricing Calculator, enter their details, and send one clear price today.",
    },
    followUps: ['What if they say it is too expensive?', 'Should I offer a discount?', 'How do I ask for payment?'],
  },
  {
    id: 'r-outreach',
    keywords: ['outreach', 'write a message', 'write an', 'cold dm', 'cold email', 'first message', 'script', 'template', 'what do i say', 'pitch'],
    text: {
      clipping:
        'A good first message is short, specific, and gives before it asks. Use this structure:\n\n1. One specific compliment: "Your point about pricing at 14:20 in the last episode was gold."\n2. One observation: "I noticed you are not posting Shorts from the podcast."\n3. One gift: "I cut a 25-second clip from that moment. Want me to send it?"\n\nThat is it. No price, no portfolio link, no life story. Keep it under 60 words and end with a yes or no question.\n\nNext step: pick one prospect, write their message with this structure, and paste it here so I can tighten it.',
      gbp:
        'A good first message is short, specific, and gives before it asks. Use this structure:\n\n1. One specific observation: "I searched for dentists near Oak Street and you show up 7th."\n2. One visible problem: "Your profile has no services listed and 12 unanswered reviews."\n3. One gift: "I made a one-page audit with 5 quick fixes. Want me to send it over?"\n\nNo price and no jargon like SEO. Owners care about calls and customers. Keep it under 60 words.\n\nNext step: pick one business, write the message with this structure, and paste it here so I can tighten it.',
    },
    followUps: ['Make it shorter.', 'Write a follow-up too.', 'What subject line should I use?'],
  },
  {
    id: 'r-portfolio',
    keywords: ['portfolio', 'no clients yet', 'no experience', 'samples', 'sample', 'proof', 'testimonial', 'case study'],
    text: {
      clipping:
        'You do not need clients to have a portfolio. You need proof you can do the work.\n\n1. Pick 3 creators you would love to work with.\n2. Cut one 20 to 30-second clip from each: strong hook, bold captions, clean cuts.\n3. Put them in one shared folder or a simple page. Three clips is enough.\n\nBonus: each sample doubles as your outreach gift for that exact creator. You build the portfolio and the pipeline at the same time.\n\nNext step: make your first sample clip today. Give yourself 45 minutes. Done beats perfect.',
      gbp:
        'You do not need clients to have a portfolio. You need proof you can spot and fix problems.\n\n1. Pick 3 local businesses with weak profiles.\n2. Write a one-page audit for each: 5 problems, 5 fixes, and one screenshot comparing them to the top competitor.\n3. Save them as PDFs. That is your portfolio.\n\nBonus: each audit doubles as your outreach gift for that exact business. For a real before and after, optimize a profile for a friend or family business for free.\n\nNext step: finish your first one-page audit today in 45 minutes.',
    },
    followUps: ['What makes a good sample?', 'Should I work for free?'],
  },
  {
    id: 'r-confidence',
    keywords: ['scared', 'afraid', 'fear', 'nervous', 'confidence', 'confident', 'imposter', 'impostor', 'not good enough', 'anxious', 'doubt'],
    text: {
      all:
        'That feeling is normal. Everyone who sells anything felt it before their first message. It does not go away by thinking. It goes away by sending.\n\nA few honest facts:\n\n1. Nobody you message will remember a clumsy DM next week.\n2. You are offering to solve a real problem. That is helpful, not annoying.\n3. You only need to be one step ahead of your client, not an expert.\n\nShrink the task until it feels easy. Not "get a client". Just "send one message".\n\nNext step: set a 10-minute timer, send one message to the least scary prospect on your list, then come back and tell me.',
    },
    followUps: ['What if they are rude?', 'Help me write that one message.'],
  },
  {
    id: 'r-time',
    keywords: ['no time', 'enough time', 'time management', 'busy', 'schedule', 'school', 'classes', 'full-time job', 'procrastinat', 'overwhelmed', 'focus'],
    text: {
      all:
        'You do not need more time. You need a smaller, fixed slot. Forty-five focused minutes a day is enough to land a first client in 30 days.\n\n1. Pick one slot and protect it. Same time every day.\n2. Split it: 25 minutes of outreach first, 20 minutes of learning or delivery after.\n3. Outreach always comes first. Lessons feel productive, but messages make money.\n\nOn bad days, do the 10-minute version: send two messages and keep your streak.\n\nNext step: choose your daily slot now, put it in your calendar, and start today\'s mission inside it.',
    },
    followUps: ['What is the 10-minute version?', 'I missed a day. What now?'],
  },
  {
    id: 'r-switch',
    keywords: ['switch', 'change path', 'other path', 'wrong path', 'different path', 'change my path'],
    text: {
      all:
        'You can switch paths any time from Profile, then Paths, and your progress on each one is saved. Before you do, check why you want to switch.\n\n1. If you dislike the actual work, switch. Life is too short.\n2. If you have had no replies yet, that is an outreach problem, and it will follow you to the other path.\n3. If you have sent fewer than 30 messages, you have not really tested this path yet.\n\nMy rule: give a path 7 full days and 30 messages before you judge it.\n\nNext step: tell me what is making you want to switch, and I will give you an honest recommendation.',
    },
    followUps: ['I do not enjoy the work.', 'I am not getting replies.', 'Compare the two paths for me.'],
  },
  {
    id: 'r-today',
    keywords: ['today', 'what should i do', 'what now', 'next step', 'where do i start', 'what next', 'stuck'],
    text: {
      clipping:
        'Keep it simple. Today has three jobs, in this order:\n\n1. Do today\'s mission. It takes about 35 minutes and moves the program forward.\n2. Answer every open reply. Warm conversations are worth more than new ones.\n3. Send 5 new outreach messages with a sample clip attached.\n\nIf you only have 15 minutes, do number 2. Money is closest to the people already talking to you.\n\nNext step: open Today\'s Mission and complete the first task before you do anything else.',
      gbp:
        'Keep it simple. Today has three jobs, in this order:\n\n1. Do today\'s mission. It takes about 35 minutes and moves the program forward.\n2. Answer every open reply or missed call. Warm conversations are worth more than new ones.\n3. Audit and contact 5 new local businesses, each with one specific problem you spotted.\n\nIf you only have 15 minutes, do number 2. Money is closest to the people already talking to you.\n\nNext step: open Today\'s Mission and complete the first task before you do anything else.',
    },
    followUps: ['I only have 15 minutes.', 'Who should I reply to first?'],
  },
  {
    id: 'r-find-clients',
    keywords: ['find clients', 'find client', 'get clients', 'finding clients', 'find local', 'find businesses', 'find creators', 'prospect', 'leads', 'where do i find', 'who should i contact'],
    text: {
      clipping:
        'Look for creators who already make long content and are not clipping it. They have the raw material and the need.\n\n1. Search YouTube and podcast apps for your favorite topics. Filter for 10K to 100K followers: big enough to pay, small enough to reply.\n2. Check their Shorts, Reels and TikTok tabs. Empty or stale is your signal.\n3. Check that they post weekly. Consistent creators become retainers.\n\nAdd each one to Prospects with a note about one clip-worthy moment.\n\nNext step: find 10 creators in the next 30 minutes and add them to your list. Do not message anyone until you have 10.',
      gbp:
        'Look for local businesses that depend on Google Maps and have a weak profile. They feel the pain already.\n\n1. Search Google Maps for "dentist", "gym", "salon" or "roofer" plus your city.\n2. Skip the top 3. Look at results 5 to 15: under 50 reviews, few photos, missing hours or services.\n3. Prefer businesses where one customer is worth $200 or more. They can afford you.\n\nAdd each one to Prospects with the biggest problem you spotted.\n\nNext step: find 10 businesses in the next 30 minutes and add them to your list. Do not contact anyone until you have 10.',
    },
    followUps: ['Which niche should I pick?', 'Help me write an outreach message.', 'How many prospects do I need?'],
  },
]

export const fallbackReply: CoachReply = {
  id: 'r-fallback',
  keywords: [],
  text: {
    all:
      'Good question. I want to give you something you can use, not a generic answer, so tell me a bit more: who are you talking to, what did they say, and what result do you want?\n\nWhile you think about it, here is the rule that solves most problems at this stage: more conversations. If you are unsure what to do, send one more message or answer one open reply.\n\nNext step: open Today\'s Mission and finish the first task, then come back with the details and I will help you with the exact words.',
  },
  followUps: ['What should I do today?', 'How do I find clients?', 'What should I charge?'],
}

export const coachTips: Record<PathId, string[]> = {
  clipping: [
    'Lead with a free sample clip. Showing beats explaining every time.',
    'The first 2 seconds decide everything. Start each clip in the middle of the best sentence.',
    'Price by the pack, never by the hour. Clients buy outcomes, not your time.',
    'Reply to warm leads within a few hours. Speed reads as professionalism.',
    'Creators with 10K to 100K followers are the sweet spot: big enough to pay, small enough to answer.',
    'Deliver one day early on your first project. It is the cheapest way to earn a retainer.',
  ],
  gbp: [
    'Lead with one specific problem on their profile. A screenshot does the selling for you.',
    'Talk about calls and customers, never about SEO or algorithms.',
    'Skip the top 3 map results. Businesses ranked 5th to 15th feel the pain and want help.',
    'Call between 2 and 4 pm. Owners are calmer after the lunch rush.',
    'Replying to every review is the fastest visible win. Do it first and send the before and after.',
    'Anchor your price to the value of one new customer. $300 is small next to a $1,200 patient.',
  ],
}

/** Builds an alternating user/coach thread, two minutes apart. `start` returns an ISO date for minute offset m. */
function thread(id: string, title: string, start: (m: number) => string, texts: string[]): CoachConversation {
  const messages: ChatMessage[] = texts.map((text, i) => ({
    id: `${id}-m${i + 1}`,
    from: i % 2 === 0 ? 'user' : 'coach',
    text,
    date: start(i * 2),
  }))
  return { id, title, date: messages[messages.length - 1].date, messages }
}

const at = (days: number, hour: number, minute = 0) => (m: number) => daysAgo(days, hour, minute + m)

/** Past conversations, newest first. */
export const seedConversations: CoachConversation[] = [
  thread('c-01', 'Pricing a 50K-follower creator', (m) => hoursAgo(28 - m / 60), [
    'I found a creator with 50K followers. What should I charge?',
    "Start by understanding what they're asking for… then quote a pack, not an hourly rate. For a creator around 50K, a starter pack works best:\n\n1. 5 clips with captions and a strong hook: $150–$250.\n2. Two rounds of revisions included.\n3. Delivery in 5 to 7 days.\n\nYou already sold this pack to Jordan for $150, so quote $180 this time.\n\nNext step: send one clear price today, not a menu.",
    'What if she says that is too expensive?',
    'Do not drop the price. Shrink the scope: "Totally fair. Want to start with 3 clips for $110 and see how they perform?" That keeps your rate intact and gives her an easy yes.\n\nNext step: save that line in your templates so it is ready when you need it.',
  ]),
  thread('c-02', 'Should I make free samples for Marcus?', at(2, 20, 10), [
    'Marcus Bell wants two sample clips from his own episodes before deciding. Am I working for free?',
    'A little, and it is worth it here. He replied, he asked for something specific, and he has 31K listeners. That is a warm lead, not a time-waster.\n\nSet a limit: two clips, 30 seconds each, from episode 58, within 48 hours. Watermark them lightly.\n\nNext step: block 60 minutes tomorrow and cut both clips.',
    'He said he wants a clean look with no emojis in the captions.',
    'Good, that is a buying signal. People only give style notes when they picture using the work. Follow it exactly: simple white captions, no emojis, no flashy zooms.\n\nWhen you send them, add one line: "If you like these, I can do 8 from your back catalog for $200."',
    'Got it. Cutting them tomorrow morning.',
    'Perfect. Send them before noon and set a follow-up for two days later. Tell me how he reacts.',
  ]),
  thread('c-03', 'I got paid. What now?', at(2, 12, 30), [
    'Jordan just paid the $150!! What do I do now?',
    'Congratulations, Alex. That is your first money online, and it is real.\n\nNow protect it:\n\n1. Confirm in writing: 5 clips, bold captions, hook in the first 2 seconds, delivery date.\n2. Deliver one day early.\n3. Log the payment in Revenue so your goal tracker updates.\n\nNext step: send Jordan the confirmation message in the next 10 minutes.',
    'He mentioned a monthly retainer if the clips perform. When do I bring it up?',
    'Right after delivery, while he is happy. Share one early result, then offer: "Want me to do this monthly? 10 clips for $250, delivered weekly."\n\nDo not pitch it before you deliver. Earn it first.',
  ]),
  thread('c-04', 'Brandon hired an in-house editor', at(2, 9, 30), [
    'Brandon Pierce from Alpha Sales Lab just announced he hired a full-time editor. I followed up twice for nothing.',
    'Not for nothing. You learned that channels already posting Shorts regularly are weak prospects, because the need is already covered.\n\nMark him Lost, and send one kind line: "Congrats on the hire. If your editor ever needs overflow help, I am around."\n\nNext step: add two new prospects with empty Shorts tabs to replace him.',
    'It still feels bad.',
    'It should, a little. It means you care. But look at your numbers: 18 prospects, 3 replies and a client who said yes, all in under a week. That is a strong start. One no does not change the math.\n\nGo add those two prospects, then close the app for today.',
  ]),
  thread('c-05', 'Asking Jordan for payment', at(3, 10, 15), [
    'Jordan agreed to the 5-clip pack for $150. How do I ask for the money without making it weird?',
    'It is only weird if you make it vague. Be plain:\n\n"Great, excited to start. Here is the payment link for $150. As soon as it is through I will begin, and you will have all 5 clips within 5 days."\n\nFor projects under $200, ask for 100% upfront.\n\nNext step: send that message with the link within the hour, while he is still excited.',
    'Should I send a contract?',
    'Not for $150. A clear message he replies "agreed" to is enough: scope, price, deadline, two rounds of revisions. Save contracts for retainers and projects over $500.',
  ]),
  thread('c-06', 'Fitting this around classes', at(4, 21, 5), [
    'I have classes until 5 most days and I am falling behind on missions. How do I fit this in?',
    'You need a fixed slot, not more time. Forty-five minutes a day is enough.\n\n1. Pick one slot you can protect. For you, maybe 7:30 to 8:15 pm.\n2. First 25 minutes: outreach and replies. Last 20: the lesson or editing.\n3. On heavy days, do the 10-minute version: two messages, streak saved.\n\nNext step: put the slot in your calendar now.',
    'What if I miss a day?',
    'Then you miss a day. Do not try to do two missions to catch up. Just do today\'s. Consistency beats intensity in this program.',
    'OK. 7:30 pm it is.',
    'Locked in. See you at 7:30.',
  ]),
  thread('c-07', 'Most people are not replying', at(4, 9, 20), [
    'I have messaged 12 creators and only 1 replied. Is my message bad?',
    'One out of 12 is about 8%, which is normal for cold outreach, and that one reply is a warm one. Your message is not the problem. Volume and follow-ups are.\n\nTo push it higher:\n\n1. Follow up on day 3 with a short bump.\n2. Try the business email for anyone who has not opened your DM.\n3. Attach a sample clip to every first message.\n\nNext step: send the day-3 bump to everyone you contacted three or more days ago.',
    'What should the bump say?',
    '"Hey, did you get a chance to see the clip idea I sent? Happy to cut a free sample from your latest video if useful." Under 30 words, no apology, one clear offer.',
  ]),
  thread('c-08', 'Jordan asked how much', at(5, 15, 10), [
    'Jordan Williams replied! He said: "This is actually great. How much for a handful of these every week?" What do I say?',
    'That is a buying question. Do not answer with a weekly rate yet. Start small so it is easy to say yes:\n\n"Glad you like it! Easiest way to start is a 5-clip starter pack for $150, delivered in 5 days. If you like the results we can set up a weekly rhythm."\n\nNext step: send that reply within the hour.',
    'Is $150 too low? He has a decent audience.',
    'For your first client, no. The goal of client one is proof: a result and a testimonial. You raise the price with client two. The retainer is where Jordan becomes really valuable.',
    'Sent it.',
    'Nice work. Now set a follow-up for two days and keep prospecting while you wait.',
  ]),
  thread('c-09', 'Portfolio with zero clients', at(5, 8, 45), [
    'Everyone says to show a portfolio, but I have no clients. What do I show?',
    'You show samples, not clients.\n\n1. Pick 3 creators from your prospect list.\n2. Cut one 25-second clip from each: strong hook, bold captions.\n3. Put them in one shared folder.\n\nEach sample is also the gift you send that creator. The clip you made from Growth Desk episode 112 already counts as number one.\n\nNext step: cut sample number two today.',
    'How polished do they need to be?',
    'Good enough that you would not scroll past it. Clear audio, readable captions, a hook in the first 2 seconds. Cap yourself at 45 minutes per clip. Done beats perfect.',
  ]),
  thread('c-10', 'Nervous about the first message', at(6, 9, 58), [
    'I am honestly nervous to message real creators. What if they think I am a scammer?',
    'Scammers send vague mass messages and ask for money. You will send one specific compliment and a free sample. That is the opposite.\n\nShrink the task. Not "get a client". Just "send one message".\n\nNext step: pick the least scary creator on your list and send them one DM in the next 10 minutes.',
    'OK, I sent one to The Growth Desk Podcast with a sample from episode 112.',
    'That is the hardest message you will ever send, and it is done. Whatever he answers, you are now someone who does outreach.\n\nSend two more tomorrow. Momentum is everything in week one.',
  ]),
]
