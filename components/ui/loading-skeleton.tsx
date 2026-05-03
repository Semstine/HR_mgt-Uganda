import { cn } from '@/lib/utils'

interface SkeletonProps { className?: string; style?: React.CSSProperties }

export function Skeleton({ className, style }: SkeletonProps) {
  return <div className={cn('skeleton', className)} style={style} />
}

export function CardSkeleton() {
  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-8 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-40" />
    </div>
  )
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="card overflow-hidden">
      <div className="bg-slate-50 px-4 py-3 flex gap-4 border-b border-gray-100">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3" style={{ width: `${60 + Math.random() * 60}px` }} />
        ))}
      </div>
      <div className="divide-y divide-gray-50">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-4 py-4 flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
            {Array.from({ length: cols - 1 }).map((_, j) => (
              <Skeleton key={j} className="h-3.5" style={{ width: `${50 + Math.random() * 50}px` }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
      </div>
      <TableSkeleton />
    </div>
  )
}
