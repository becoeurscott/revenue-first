import { Button } from '@/components/ui/Button'

/** Mock SSO. Both buttons run the same simulated sign-in. */
export function SocialButtons({ onContinue, disabled }: { onContinue: () => void; disabled?: boolean }) {
  return (
    <>
      <div className="my-6 flex items-center gap-3 text-xs font-medium text-faint" role="separator">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>
      <div className="space-y-3">
        <Button variant="secondary" size="lg" full disabled={disabled} onClick={onContinue} icon={<span aria-hidden className="text-lg font-bold">G</span>}>
          Continue with Google
        </Button>
        <Button variant="secondary" size="lg" full disabled={disabled} onClick={onContinue} icon={<span aria-hidden className="text-lg"></span>}>
          Continue with Apple
        </Button>
      </div>
    </>
  )
}
