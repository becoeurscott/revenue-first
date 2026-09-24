import { cn } from '@/lib/cn'

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton rounded-md', className)} />
}

export function CardSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5" aria-hidden>
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn('mt-4 h-3', i % 2 ? 'w-4/5' : 'w-full')} />
      ))}
    </div>
  )
}

export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} lines={1} />
      ))}
    </div>
  )
}
