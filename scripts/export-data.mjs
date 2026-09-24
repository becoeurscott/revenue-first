// Dumps the TypeScript mock data layer to JSON for the native iOS app.
// Dates are exported as ISO strings plus `exportedAt`; the app shifts them so the demo always feels current.
import { createServer } from 'vite'
import { writeFileSync } from 'node:fs'

const out = new URL('../ios/FirstRevenue/FirstRevenue/Resources/Data/', import.meta.url)
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const load = (p) => server.ssrLoadModule(p)

const [paths, missions, lessons, resources, prospects, revenue, messages, pricing, notifications, achievements, coach, help, subscription, onboarding, users] = await Promise.all(
  ['paths', 'missions', 'lessons', 'resources', 'prospects', 'revenue', 'messages', 'pricing', 'notifications', 'achievements', 'coach', 'help', 'subscription', 'onboarding', 'users'].map((m) => load(`/src/data/${m}.ts`)),
)

// The native app uses SF Symbols, never emoji. Every `emoji` field becomes an `icon` (SF Symbol name).
const SYMBOLS = {
  '🎬': 'film', '📍': 'mappin.and.ellipse', '🎯': 'target', '🔥': 'flame.fill', '💬': 'bubble.left.and.bubble.right.fill',
  '📝': 'square.and.pencil', '🤖': 'sparkles', '🤝': 'person.2.fill', '🏅': 'medal.fill', '💵': 'dollarsign.circle.fill',
  '🎓': 'graduationcap.fill', '⏰': 'alarm.fill', '📋': 'list.clipboard.fill', '👋': 'hand.wave.fill', '👣': 'figure.walk',
  '⚡': 'bolt.fill', '🔍': 'magnifyingglass', '💰': 'banknote.fill', '📚': 'books.vertical.fill', '🏆': 'trophy.fill',
  '🚀': 'paperplane.fill', '🗓️': 'calendar', '📇': 'person.text.rectangle.fill', '💳': 'creditcard.fill', '✅': 'checkmark.seal.fill',
  '🧰': 'wrench.and.screwdriver.fill', '📈': 'chart.line.uptrend.xyaxis', '🔀': 'arrow.triangle.swap', '🧭': 'safari.fill',
  '💼': 'briefcase.fill', '🧑‍💻': 'laptopcomputer', '🎥': 'video.fill', '🔎': 'magnifyingglass.circle.fill', '✨': 'sparkles',
  '🛠️': 'hammer.fill', '✍️': 'pencil.and.scribble', '🎨': 'paintpalette.fill', '📱': 'iphone', '📣': 'megaphone.fill',
  '🎧': 'headphones', '📷': 'camera.fill', '🔬': 'magnifyingglass', '💻': 'chevron.left.forwardslash.chevron.right',
  '🌱': 'leaf.fill', '🐣': 'sparkle', '🧗': 'figure.climbing', '🏔️': 'mountain.2.fill', '⏱️': 'stopwatch.fill', '☕': 'cup.and.saucer.fill',
  '🪙': 'circle.circle', '🏦': 'building.columns.fill', '😰': 'cloud.bolt.rain.fill', '😬': 'cloud.drizzle.fill', '😐': 'cloud.sun.fill',
  '🙂': 'sun.max.fill', '😎': 'sun.max.trianglebadge.exclamationmark', '🏪': 'storefront.fill', '🥉': '3.circle.fill', '🥈': '2.circle.fill',
  '🥇': '1.circle.fill', '💎': 'diamond.fill', '🧱': 'square.stack.3d.up.fill', '🤷': 'questionmark.circle.fill', '📦': 'shippingbox.fill',
  '🔭': 'binoculars.fill', '🫣': 'eye.slash.fill', '📅': 'calendar.badge.checkmark', '🗺️': 'map.fill', '▶️': 'play.rectangle.fill',
  '📖': 'book.fill', '🎛️': 'slider.horizontal.3', '👀': 'eye.fill', '💪': 'figure.strengthtraining.traditional',
}
SYMBOLS['😎'] = 'star.fill'
const EMOJI_RE = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}][\u{FE0F}\u{200D}\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}]* ?/gu
const missing = new Set()
function nativeify(value) {
  if (Array.isArray(value)) return value.map(nativeify)
  if (value && typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      if (k === 'emoji') {
        out.icon = SYMBOLS[v] ?? (missing.add(v), 'circle.fill')
      } else out[k] = nativeify(v)
    }
    return out
  }
  // Collapse only spaces/tabs left behind by removed emoji — newlines are meaningful (coach replies use lists).
  return typeof value === 'string' ? value.replace(EMOJI_RE, '').replace(/[ \t]{2,}/g, ' ') : value
}

const data = nativeify({
  paths: paths.pathList,
  plans: missions.plans,
  lessons: lessons.lessons,
  lessonCategories: lessons.lessonCategories,
  resources: resources.resources,
  prospects: prospects.seedProspects,
  deals: revenue.seedDeals,
  templates: messages.outreachTemplates,
  generatorOptions: messages.generatorOptions,
  pricing: { options: pricing.pricingOptions, experienceLevels: pricing.experienceLevels, clientSizes: pricing.clientSizes, turnarounds: pricing.turnarounds, disclaimer: pricing.pricingDisclaimer },
  notifications: notifications.seedNotifications,
  achievements: achievements.achievements,
  coach: { suggestedPrompts: coach.suggestedPrompts, replies: coach.coachReplies, fallback: coach.fallbackReply, tips: coach.coachTips, conversations: coach.seedConversations },
  help: { faqs: help.faqs, topics: help.helpTopics, problemCategories: help.problemCategories },
  subscription: { plans: subscription.plans, benefits: subscription.premiumBenefits },
  onboarding: { steps: onboarding.onboardingSteps, analysisSteps: onboarding.analysisSteps },
  user: users.mockUser,
  answers: users.mockAnswers,
})
if (missing.size) console.warn('No SF Symbol mapping for:', [...missing].join(' '))
data.exportedAt = new Date().toISOString()

writeFileSync(new URL('mock.json', out), JSON.stringify(data, null, 1))
console.log('wrote mock.json', Object.fromEntries(Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? v.length : typeof v])))
await server.close()
