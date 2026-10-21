import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SearchX, X } from 'lucide-react'
import { EmptyState, useI18n } from 'archon-ui'
import DocumentRow from '../../components/DocumentRow'
import ListSkeleton from '../../components/ListSkeleton'
import PageHeader from '../../components/PageHeader'
import SearchInput from '../../components/SearchInput'
import { useCatalog } from '../../lib/catalog'
import { documentStatuses, documentTypes, statusLabelKey, typeLabelKey } from '../../lib/docMeta'
import { fillTemplate } from '../../lib/format'
import { useDebounce } from '../../lib/useDebounce'
import { useQuery } from '../../lib/useQuery'
import { documentService } from '../../services/documentService'
import type { DocumentSearchHit, DocumentStatusValue, DocumentTypeValue } from '../../types/almanac'

const selectClass = 'h-9 rounded-md border border-input bg-card px-3 text-sm outline-none focus:border-primary focus:ring-[3px] focus:ring-ring/25'

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${active ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'}`}>
      {children}
    </button>
  )
}

export default function Search() {
  const { t } = useI18n()
  const { summaries } = useCatalog()
  const [params, setParams] = useSearchParams()

  const query = params.get('q') ?? ''
  const product = params.get('produto') ?? ''
  const module = params.get('modulo') ?? ''
  const status = Number(params.get('status') ?? 0) as DocumentStatusValue | 0
  const type = Number(params.get('tipo') ?? 0) as DocumentTypeValue | 0
  const tag = params.get('tag') ?? ''

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params)

    Object.entries(changes).forEach(([key, value]) => {
      if (value) {
        next.set(key, value)
      } else {
        next.delete(key)
      }
    })

    setParams(next, { replace: true })
  }

  const debouncedQuery = useDebounce(query, 350)

  const results = useQuery<DocumentSearchHit[]>(
    () => documentService.search({ query: debouncedQuery, product: product || undefined, module: module || undefined, status: status || undefined, tags: tag ? [tag] : undefined, limit: 50 }),
    [debouncedQuery, product, module, status, tag]
  )

  const products = useMemo(() => {
    const map = new Map<string, string>()
    summaries.forEach((item) => map.set(item.product, item.productName))
    return Array.from(map.entries())
  }, [summaries])

  const modules = summaries.filter((item) => item.product === product)
  const hits = (results.data ?? []).filter((hit) => !type || hit.type === type)
  const hasFilters = Boolean(product || module || status || type || tag)

  return (
    <div className="mx-auto w-full max-w-5xl p-6">
      <PageHeader title={t('web.search.title')} subtitle={t('web.search.subtitle')} />

      <SearchInput value={query} onChange={(value) => update({ q: value })} autoFocus />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <select className={selectClass} value={product} onChange={(event) => update({ produto: event.target.value, modulo: '' })} aria-label={t('web.filter.product')}>
          <option value="">{t('web.filter.allProducts')}</option>
          {products.map(([slug, name]) => (
            <option key={slug} value={slug}>
              {name}
            </option>
          ))}
        </select>
        <select className={selectClass} value={module} disabled={!product} onChange={(event) => update({ modulo: event.target.value })} aria-label={t('web.filter.module')}>
          <option value="">{t('web.filter.allModules')}</option>
          {modules.map((item) => (
            <option key={item.module} value={item.module}>
              {item.moduleName}
            </option>
          ))}
        </select>
        {hasFilters && (
          <button type="button" onClick={() => update({ produto: '', modulo: '', status: '', tipo: '', tag: '' })} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <X size={14} />
            {t('web.filter.clear')}
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('web.filter.type')}</span>
        {documentTypes.map((item) => (
          <Chip key={item} active={type === item} onClick={() => update({ tipo: type === item ? '' : String(item) })}>
            {t(typeLabelKey[item])}
          </Chip>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('web.filter.status')}</span>
        {documentStatuses.map((item) => (
          <Chip key={item} active={status === item} onClick={() => update({ status: status === item ? '' : String(item) })}>
            {t(statusLabelKey[item])}
          </Chip>
        ))}
        {tag && (
          <Chip active onClick={() => update({ tag: '' })}>
            #{tag} ×
          </Chip>
        )}
      </div>

      <div className="mt-6" aria-live="polite">
        {results.loading ? (
          <ListSkeleton />
        ) : hits.length === 0 ? (
          <EmptyState icon={<SearchX size={40} />} title={t('web.search.empty.title')} description={query ? fillTemplate(t('web.search.empty.description'), query) : t('web.search.empty.noQuery')} />
        ) : (
          <>
            <p className="mb-3 text-sm text-muted-foreground">{fillTemplate(t('web.search.count'), hits.length)}</p>
            <ul className="space-y-3">
              {hits.map((hit) => (
                <DocumentRow key={hit.id} hit={hit} />
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
