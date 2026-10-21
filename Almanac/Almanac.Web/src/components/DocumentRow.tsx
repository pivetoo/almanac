import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useCatalog } from '../lib/catalog'
import { formatRelative } from '../lib/format'
import { useI18n } from 'archon-ui'
import type { DocumentSearchHit } from '../types/almanac'
import { StatusBadge, TypeBadge } from './Badges'

interface DocumentRowProps {
  hit: DocumentSearchHit
  showLocation?: boolean
  actions?: React.ReactNode
}

export default function DocumentRow({ hit, showLocation = true, actions }: DocumentRowProps) {
  const { culture } = useI18n()
  const { findSummary } = useCatalog()
  const summary = findSummary(hit.product, hit.module)

  return (
    <li className="group flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40">
      <Link to={`/docs/${hit.id}`} className="min-w-0 flex-1">
        {showLocation && (
          <p className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
            <span>{summary?.productName ?? hit.product}</span>
            <ChevronRight size={12} />
            <span>{summary?.moduleName ?? hit.module}</span>
          </p>
        )}
        <h3 className="text-base font-semibold text-foreground group-hover:text-primary">{hit.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{hit.summary}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <TypeBadge type={hit.type} />
          <StatusBadge status={hit.status} />
          {hit.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              {tag}
            </span>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">{formatRelative(hit.updatedAt, culture)}</span>
        </div>
      </Link>
      {actions && <div className="flex shrink-0 flex-col gap-2">{actions}</div>}
    </li>
  )
}
