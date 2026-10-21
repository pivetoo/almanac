import { useMemo, useState } from 'react'
import { CheckCheck, PartyPopper } from 'lucide-react'
import { Button, EmptyState, Tabs, TabsBadge, TabsList, TabsTrigger, useApi, useI18n, usePermissions } from 'archon-ui'
import DocumentRow from '../../components/DocumentRow'
import ListSkeleton from '../../components/ListSkeleton'
import PageHeader from '../../components/PageHeader'
import { useCatalog } from '../../lib/catalog'
import { useQuery } from '../../lib/useQuery'
import { documentService } from '../../services/documentService'
import { DocumentStatus } from '../../types/almanac'
import type { DocumentSearchHit, DocumentStatusValue } from '../../types/almanac'

export default function Review() {
  const { t } = useI18n()
  const { hasCapability } = usePermissions()
  const { summaries } = useCatalog()
  const api = useApi({ showSuccessMessage: true })
  const [tab, setTab] = useState<string>(String(DocumentStatus.Draft))
  const [product, setProduct] = useState('')
  const [hidden, setHidden] = useState<number[]>([])

  const drafts = useQuery<DocumentSearchHit[]>(() => documentService.search({ status: DocumentStatus.Draft, limit: 50 }), [])
  const outdated = useQuery<DocumentSearchHit[]>(() => documentService.search({ status: DocumentStatus.Outdated, limit: 50 }), [])

  const products = useMemo(() => {
    const map = new Map<string, string>()
    summaries.forEach((item) => map.set(item.product, item.productName))
    return Array.from(map.entries())
  }, [summaries])

  const canReview = hasCapability('documentos.revisar')
  const source = tab === String(DocumentStatus.Draft) ? drafts : outdated
  const visible = (source.data ?? []).filter((hit) => !hidden.includes(hit.id) && (!product || hit.product === product))
  const count = (list: DocumentSearchHit[] | null) => (list ?? []).filter((hit) => !hidden.includes(hit.id)).length

  const mark = async (hit: DocumentSearchHit, status: DocumentStatusValue) => {
    const result = await api.execute(() => documentService.setStatus(hit.id, status))

    if (result) {
      setHidden((current) => [...current, hit.id])
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl p-6">
      <PageHeader title={t('web.review.title')} subtitle={t('web.review.subtitle')} />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value={String(DocumentStatus.Draft)} className="gap-2">
              {t('web.status.draft')}
              <TabsBadge>{count(drafts.data)}</TabsBadge>
            </TabsTrigger>
            <TabsTrigger value={String(DocumentStatus.Outdated)} className="gap-2">
              {t('web.status.outdated')}
              <TabsBadge>{count(outdated.data)}</TabsBadge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <select className="h-9 rounded-md border border-input bg-card px-3 text-sm outline-none focus:border-primary" value={product} onChange={(event) => setProduct(event.target.value)} aria-label={t('web.filter.product')}>
          <option value="">{t('web.filter.allProducts')}</option>
          {products.map(([slug, name]) => (
            <option key={slug} value={slug}>{name}</option>
          ))}
        </select>
      </div>

      {source.loading ? (
        <ListSkeleton />
      ) : visible.length === 0 ? (
        <EmptyState icon={<PartyPopper size={40} />} title={t('web.review.empty.title')} description={t('web.review.empty.description')} />
      ) : (
        <ul className="space-y-3">
          {visible.map((hit) => (
            <DocumentRow
              key={hit.id}
              hit={hit}
              actions={
                canReview && (
                  <>
                    <Button size="sm" variant="success" icon={<CheckCheck />} disabled={api.isLoading} onClick={() => mark(hit, DocumentStatus.Reviewed)}>
                      {t('web.review.markReviewed')}
                    </Button>
                    {hit.status === DocumentStatus.Draft && (
                      <Button size="sm" variant="outline" disabled={api.isLoading} onClick={() => mark(hit, DocumentStatus.Outdated)}>
                        {t('web.review.markOutdated')}
                      </Button>
                    )}
                  </>
                )
              }
            />
          ))}
        </ul>
      )}
    </div>
  )
}
