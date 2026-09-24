import { Suspense, useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { AlertTriangle, Search, WifiOff } from 'lucide-react'
import { ListSkeleton } from '@/components/ui/Skeleton'
import { Avatar } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import { useProgram } from '@/store/selectors'
import { useApp } from '@/store/useApp'
import { Logo } from './Logo'
import { mobileNav, sidebarFooterNav, sidebarNav } from './nav'

function SideLink({ to, label, icon: Icon }: (typeof sidebarNav)[number]) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-all duration-200',
          isActive ? 'bg-brand-500/15 text-ink shadow-[inset_2px_0_0_var(--color-brand-400)]' : 'text-muted hover:bg-surface-2 hover:text-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cn('size-4.5', isActive && 'text-brand-300')} aria-hidden />
          {label}
        </>
      )}
    </NavLink>
  )
}

function Sidebar() {
  const user = useApp((s) => s.user)
  const { progress, path } = useProgram()
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-bg-raised px-4 py-6 lg:flex">
      <Link to="/home" className="px-2" aria-label="FirstRevenue home">
        <Logo />
      </Link>
      <Link to="/search" className="mt-6 flex h-11 items-center gap-2.5 rounded-full border border-line bg-surface px-4 text-sm text-faint transition-colors hover:border-line-strong hover:text-muted">
        <Search className="size-4" aria-hidden /> Search
      </Link>
      <nav aria-label="Main" className="mt-5 flex-1 space-y-1 overflow-y-auto">
        {sidebarNav.map((n) => (
          <SideLink key={n.to} {...n} />
        ))}
      </nav>
      <div className="space-y-1 border-t border-line pt-4">
        {sidebarFooterNav.map((n) => (
          <SideLink key={n.to} {...n} />
        ))}
        <Link to="/profile" className="mt-3 flex items-center gap-3 rounded-lg border border-line bg-surface p-3 transition-colors hover:border-line-strong">
          <Avatar name={user.name || 'You'} size={36} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{user.name || 'You'}</span>
            <span className="block truncate text-xs text-faint">Day {progress.currentDay} · {path.name}</span>
          </span>
        </Link>
      </div>
    </aside>
  )
}

function BottomNav() {
  return (
    <nav aria-label="Main" className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg-raised/90 backdrop-blur-xl lg:hidden">
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2">
        {mobileNav.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink to={to} className="group flex h-16 flex-col items-center justify-center gap-1" aria-label={label}>
              {({ isActive }) => (
                <>
                  <span className={cn('flex h-8 w-14 items-center justify-center rounded-full transition-all duration-300 ease-spring', isActive ? 'bg-brand-gradient text-white shadow-glow-sm' : 'text-faint group-hover:text-muted group-active:scale-90')}>
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className={cn('text-[11px] font-semibold transition-colors', isActive ? 'text-ink' : 'text-faint')}>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function StatusBanners() {
  const offline = useApp((s) => s.settings.offline)
  const expired = useApp((s) => s.subscription.status === 'expired')
  return (
    <>
      {offline && (
        <div role="alert" className="flex items-center justify-center gap-2 bg-warning/15 px-4 py-2 text-[13px] font-medium text-warning">
          <WifiOff className="size-4" aria-hidden /> You're offline. Changes are saved on this device.
        </div>
      )}
      {expired && (
        <Link to="/subscription" className="flex items-center justify-center gap-2 bg-danger/15 px-4 py-2 text-[13px] font-medium text-danger">
          <AlertTriangle className="size-4" aria-hidden /> Your Premium has expired. Renew to keep your plan going →
        </Link>
      )}
    </>
  )
}

/** Signed-in chrome: sidebar on desktop, bottom tabs on mobile. */
export function AppShell() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded-md focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold">
        Skip to content
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <StatusBanners />
        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 sm:px-6 lg:px-10 lg:pb-16">
          <Suspense fallback={<div className="pt-24"><ListSkeleton /></div>}>
            <div key={pathname} className="animate-fade-up [animation-fill-mode:backwards]">
              <Outlet />
            </div>
          </Suspense>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
