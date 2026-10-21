import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FilePlus2, FileText } from 'lucide-react'
import { Button, EmptyState, useI18n, usePermissions } from 'archon-ui'
import DocumentRow from '../../components/DocumentRow'
import ListSkeleton from '../../components/ListSkeleton'
import PageHeader from '../../components/PageHeader'
import { useCatalog } from '../../lib/catalog'
import { documentStatuses, documentTypes, statusLabelKey, typeLabelKey } from '../../lib/docMeta'
import { useQuery } from '../../lib/useQuery'
import { documentService } from '../../services/documentService'
import type { DocumentSearchHit, DocumentStatusValue } from '../../types/almanac'
import NotFound from '../NotFound'

export default function ModulePage() {
  const { product = '', module = '' } = useParams()
  const { t } = useI18n()
  const navigate = useNavigate()
  const { hasCapability } = usePermissions()
  const { findSummary, loading } = useCatalog()
  const [status, setStatus] = useState<DocumentStatusValue | 0>(0)

  const summary = findSummary(product, module)
  const documents = useQuery<DocumentSearchHit[]>(() => documentService.search({ product, module, limit: 50 }), [product, module])

  const grouped = useMemo(() => {
    const visible = (documents.data ?? []).filter((hit) => !status || hit.status === status)
    return documentTypes.map((type) => ({ type, items: visible.filter((hit) => hit.type === type) })).filter((group) => group.items.length > 0)
  }, [documents.data, status])

  if (!summary && !loading) {
    return <NotFound />
  }

  return (
    <div className="mx-auto w-full max-w-4xl p-6">
      <PageHeader
        title={summary?.moduleName ?? module}
        subtitle={summary?.description ?? undefined}
        eyebrow={
          <span className="flex items-center gap-1">
            <Link to="/" className="hover:text-foreground">{t('web.nav.home')}</Link>
            <span>/</span>
            <Link to={`/produtos/${product}`} className="hover:text-foreground">{summary?.productName ?? product}</Link>
          </span>
        }
        actions={
          hasCapability('documentos.editar') && (
            <Button size="sm" icon={<FilePlus2 />} onClick={() => navigate(`/docs/novo?produto=${product}&modulo=${module}`)}>
              {t('web.home.newDocument')}
            </Button>
          )
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setStatus(0)} aria-pressed={status === 0} className={`rounded-full border px-3 py-1 text-xs font-medium ${status === 0 ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
          {t('web.filter.all')}
        </button>
        {documentStatuses.map((item) => (
          <button key={item} type="button" onClick={() => setStatus(status === item ? 0 : item)} aria-pressed={status === item} className={`rounded-full border px-3 py-1 text-xs font-medium ${status === item ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
            {t(statusLabelKey[item])}
          </button>
        ))}
      </div>

      {documents.loading ? (
        <ListSkeleton />
      ) : grouped.length === 0 ? (
        <EmptyState icon={<FileText size={36} />} title={t('web.module.empty.title')} description={t('web.module.empty.description')} />
      ) : (
        <div className="space-y-8">
          {grouped.map((group) => (
            <section key={group.type} aria-label={t(typeLabelKey[group.type])}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t(typeLabelKey[group.type])}</h2>
              <ul className="space-y-3">
                {group.items.map((hit) => (
                  <DocumentRow key={hit.id} hit={hit} showLocation={false} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
