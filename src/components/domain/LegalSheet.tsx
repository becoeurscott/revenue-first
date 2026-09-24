import { Sheet } from '@/components/ui/Sheet'

export type LegalDoc = 'privacy' | 'terms'

const docs: Record<LegalDoc, { title: string; description: string; sections: { heading: string; body: string }[] }> = {
  privacy: {
    title: 'Privacy policy',
    description: 'The short version: your data never leaves this device.',
    sections: [
      { heading: 'What we collect', body: 'Only what you type into the app: your name, email, onboarding answers, prospects, deals and messages. In this prototype none of it is sent to a server.' },
      { heading: 'Where it lives', body: 'Everything is stored in your browser’s local storage under a single key. Clearing your browser data, or using "Reset demo data" in Settings, removes it completely.' },
      { heading: 'Who we share it with', body: 'Nobody. There are no analytics, no ad trackers and no third-party SDKs in this build.' },
      { heading: 'Your choices', body: 'You can export a copy of your data as a JSON file or wipe it at any time from Settings → Privacy → Your data.' },
    ],
  },
  terms: {
    title: 'Terms of service',
    description: 'Plain-language terms for the FirstRevenue prototype.',
    sections: [
      { heading: 'A prototype, not a product', body: 'FirstRevenue is a demonstration. Every person, business, message and payment you see is fictitious. Checkout is simulated and no payment is ever taken.' },
      { heading: 'No income guarantee', body: 'The program teaches a process for finding your first clients. Results depend on your effort, your market and your follow-through. We do not promise earnings.' },
      { heading: 'Use it responsibly', body: 'When you contact real people, be honest about who you are, respect opt-outs and follow the rules of the platform you are using. No spam.' },
      { heading: 'Subscriptions', body: 'In a live version Premium would renew automatically until cancelled, and you would keep access until the end of the paid period. In this prototype plans only change local state.' },
    ],
  },
}

/** Short, real legal copy shown from Settings and the paywall. */
export function LegalSheet({ doc, open, onClose }: { doc: LegalDoc; open: boolean; onClose: () => void }) {
  const d = docs[doc]
  return (
    <Sheet open={open} onClose={onClose} title={d.title} description={d.description}>
      <div className="space-y-4 pb-2">
        {d.sections.map((s) => (
          <section key={s.heading}>
            <h3 className="text-[15px] font-semibold">{s.heading}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">{s.body}</p>
          </section>
        ))}
        <p className="text-xs text-faint">Last updated for prototype build 0.9.0.</p>
      </div>
    </Sheet>
  )
}
