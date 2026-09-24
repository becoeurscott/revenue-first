import { Link, useNavigate } from 'react-router-dom'
import { CircleDollarSign, PenLine, Tags } from 'lucide-react'
import { OutreachFollowUpsTab } from '@/components/domain/OutreachFollowUpsTab'
import { OutreachMessagesTab } from '@/components/domain/OutreachMessagesTab'
import { OutreachProspectsTab } from '@/components/domain/OutreachProspectsTab'
import { OutreachTemplatesTab } from '@/components/domain/OutreachTemplatesTab'
import { Page } from '@/components/layout/Page'
import { Tabs } from '@/components/ui/Chips'

type HubTab = 'Prospects' | 'Messages' | 'Templates' | 'Follow-ups'

const TABS: readonly HubTab[] = ['Prospects', 'Messages', 'Templates', 'Follow-ups']
const ROUTES: Record<HubTab, string> = {
  Prospects: '/prospects',
  Messages: '/outreach',
  Templates: '/outreach/templates',
  'Follow-ups': '/outreach/follow-ups',
}

const QUICK_ACTIONS = [
  { to: '/outreach/generate', label: 'Write a message', icon: PenLine, primary: true },
  { to: '/pricing', label: 'Pricing help', icon: Tags, primary: false },
  { to: '/revenue', label: 'Revenue', icon: CircleDollarSign, primary: false },
]

export default function OutreachHub({ tab }: { tab: HubTab }) {
  const navigate = useNavigate()
  return (
    <Page title="Outreach" subtitle="Find them, message them, follow up." large>
      <nav aria-label="Quick actions" className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {QUICK_ACTIONS.map(({ to, label, icon: Icon, primary }) => (
          <Link
            key={to}
            to={to}
            className={
              primary
                ? 'inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-brand-gradient px-4 text-[13px] font-semibold text-white shadow-glow-sm transition-all duration-200 hover:brightness-110 active:scale-95'
                : 'inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-line bg-surface px-4 text-[13px] font-semibold text-ink-soft transition-all duration-200 hover:border-line-strong hover:bg-surface-2 active:scale-95'
            }
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>

      <Tabs options={TABS} value={tab} onChange={(t) => navigate(ROUTES[t])} label="Outreach sections" />

      <div className="mt-5" role="tabpanel" aria-label={tab}>
        {tab === 'Prospects' && <OutreachProspectsTab />}
        {tab === 'Messages' && <OutreachMessagesTab />}
        {tab === 'Templates' && <OutreachTemplatesTab />}
        {tab === 'Follow-ups' && <OutreachFollowUpsTab />}
      </div>
    </Page>
  )
}
