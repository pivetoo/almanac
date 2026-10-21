import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, ClipboardCheck, FilePlus2, Layers, Sparkles } from 'lucide-react'
import { Button, EmptyState, Skeleton, useI18n, usePermissions } from 'archon-ui'
import DocumentRow from '../../components/DocumentRow'
import ListSkeleton from '../../components/ListSkeleton'
import SearchInput from '../../components/SearchInput'
import { useCatalog } from '../../lib/catalog'
import { fillTemplate, formatNumber } from '../../lib/format'
import { useQuery } from '../../lib/useQuery'
import { documentService } from '../../services/documentService'
import type { DocumentSearchHit, DocumentStats } from '../../types/almanac'

interface ProductCardData {
  slug: string
  name: string
  description?: string | null
  modules: number
  documents: number
}

export default function Home() {
  const { t, culture } = useI18n()
  const navigate = useNavigate()
  const { hasCapability } = usePermissions()
  const { products, summaries, loading: catalogLoading } = useCatalog()
  const [query, setQuery] = useState('')

  const stats = useQuery<DocumentStats>(() => documentService.stats(), [])
  const recent = useQuery<DocumentSearchHit[]>(() => documentService.search({ sort: 'recent', limit: 6 }), [])

  const cards = useMemo<ProductCardData[]>(() => {
    const grouped = new Map<string, ProductCardData>()

    summaries.forEach((item) => {
      const current = grouped.get(item.product) ?? { slug: item.product, name: item.productName, description: products.find((product) => product.slug === item.product)?.description, modules: 0, documents: 0 }
      current.modules += 1
      current.documents += item.documentCount
      grouped.set(item.product, current)
    })

    return Array.from(grouped.values())
  }, [summaries, products])

  const submit = () => {
    navigate(query.trim() ? `/buscar?q=${encodeURIComponent(query.trim())}` : '/buscar')
  }

  const canWrite = hasCapability('documentos.editar')
  const pending = (stats.data?.draft ?? 0) + (stats.data?.outdated ?? 0)
  const examples = t('web.home.examples').split('|')

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 p-6">
      <section className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card px-6 py-10 sm:px-10">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <BookOpen size={14} />
            {t('web.home.badge')}
          </span>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t('web.home.title')}</h1>
          <p className="mt-3 text-muted-foreground">{t('web.home.subtitle')}</p>
          <div className="mt-6 flex w-full justify-center">
            <SearchInput size="lg" value={query} onChange={setQuery} onSubmit={submit} placeholder={t('web.home.searchPlaceholder')} autoFocus />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
            <span className="text-muted-foreground">{t('web.home.tryLabel')}</span>
            {examples.map((example) => (
              <button key={example} type="button" onClick={() => navigate(`/buscar?q=${encodeURIComponent(example)}`)} className="rounded-full border border-border bg-card px-3 py-1 text-foreground transition-colors hover:border-primary hover:text-primary">
                {example}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section aria-label={t('web.home.stats')} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { key: 'total', label: t('web.home.stat.total'), value: stats.data?.total, tone: 'text-foreground' },
          { key: 'reviewed', label: t('web.home.stat.reviewed'), value: stats.data?.reviewed, tone: 'text-[hsl(142_60%_30%)] dark:text-[hsl(142_60%_62%)]' },
          { key: 'draft', label: t('web.home.stat.draft'), value: stats.data?.draft, tone: 'text-[hsl(36_90%_31%)] dark:text-[hsl(36_90%_62%)]' },
          { key: 'outdated', label: t('web.home.stat.outdated'), value: stats.data?.outdated, tone: 'text-[hsl(0_65%_45%)] dark:text-[hsl(0_72%_68%)]' }
        ].map((item) => (
          <div key={item.key} className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">{item.label}</p>
            {stats.loading ? <Skeleton className="mt-2 h-8 w-16" /> : <p className={`mt-1 text-3xl font-semibold ${item.tone}`}>{formatNumber(item.value ?? 0, culture)}</p>}
          </div>
        ))}
      </section>

      {pending > 0 && hasCapability('documentos.revisar') && (
        <Link to="/revisao" className="flex items-center justify-between gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 transition-colors hover:bg-warning/15">
          <span className="flex items-center gap-3">
            <ClipboardCheck size={20} className="text-[hsl(36_90%_31%)] dark:text-[hsl(36_90%_62%)]" />
            <span className="text-sm font-medium">{fillTemplate(t('web.home.pending'), pending)}</span>
          </span>
          <ArrowRight size={16} />
        </Link>
      )}

      <section aria-labelledby="home-products">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="home-products" className="flex items-center gap-2 text-lg font-semibold">
            <Layers size={18} />
            {t('web.home.products')}
          </h2>
          {canWrite && (
            <Button variant="outline" size="sm" icon={<FilePlus2 />} onClick={() => navigate('/docs/novo')}>
              {t('web.home.newDocument')}
            </Button>
          )}
        </div>
        {catalogLoading && cards.length === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <Skeleton key={item} className="h-36 w-full rounded-xl" />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <EmptyState icon={<Layers size={36} />} title={t('web.home.noProducts.title')} description={t('web.home.noProducts.description')} action={hasCapability('catalogo.editar') ? <Button onClick={() => navigate('/catalogo')}>{t('web.home.noProducts.action')}</Button> : undefined} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <Link key={card.slug} to={`/produtos/${card.slug}`} className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-semibold group-hover:text-primary">{card.name}</h3>
                  <ArrowRight size={16} className="mt-1 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
                <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted-foreground">{card.description || t('web.home.noDescription')}</p>
                <p className="mt-4 text-xs text-muted-foreground">
                  {fillTemplate(t('web.home.counts'), card.modules, card.documents)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="home-recent">
        <h2 id="home-recent" className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Sparkles size={18} />
          {t('web.home.recent')}
        </h2>
        {recent.loading ? (
          <ListSkeleton rows={3} />
        ) : (recent.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('web.home.noRecent')}</p>
        ) : (
          <ul className="space-y-3">
            {(recent.data ?? []).map((hit) => (
              <DocumentRow key={hit.id} hit={hit} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
