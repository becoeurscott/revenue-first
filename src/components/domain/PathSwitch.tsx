import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { PaywallSheet } from '@/components/domain/Paywall'
import { ConfirmDialog } from '@/components/ui/Sheet'
import { toast } from '@/components/ui/Toast'
import { paths } from '@/data/paths'
import type { PathId } from '@/data/types'
import { usePremium } from '@/store/selectors'
import { useApp } from '@/store/useApp'

/**
 * Premium-gated path switching. `request(id)` opens the paywall for free users,
 * or a confirmation for premium users. Render `dialogs` once in the page.
 */
export function usePathSwitch(): { request: (id: PathId) => void; dialogs: ReactNode; premium: boolean } {
  const premium = usePremium()
  const navigate = useNavigate()
  const current = useApp((s) => s.pathId)
  const switchPath = useApp((s) => s.switchPath)
  const [target, setTarget] = useState<PathId | null>(null)
  const [paywall, setPaywall] = useState(false)

  const request = (id: PathId) => {
    if (id === current) return
    if (premium) setTarget(id)
    else setPaywall(true)
  }

  const dialogs = (
    <>
      <ConfirmDialog
        open={target !== null}
        onClose={() => setTarget(null)}
        onConfirm={() => {
          if (!target) return
          switchPath(target)
          toast.success(`Switched to ${paths[target].name}`)
          navigate('/home')
        }}
        title={target ? `Switch to ${paths[target].name}?` : 'Switch path?'}
        description={`Your progress on ${paths[current].name} is saved — days, streak, prospects and revenue stay exactly where they are. You can switch back at any time.`}
        confirmLabel="Switch path"
      />
      <PaywallSheet open={paywall} onClose={() => setPaywall(false)} feature="Path switching" />
    </>
  )

  return { request, dialogs, premium }
}
