import { Skeleton } from 'archon-ui'

export default function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="space-y-3" aria-busy="true">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="rounded-lg border border-border bg-card p-4">
          <Skeleton className="mb-2 h-3 w-1/4" />
          <Skeleton className="mb-2 h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
        </li>
      ))}
    </ul>
  )
}
