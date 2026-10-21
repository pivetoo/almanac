import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, ExternalLink, FilePlus2, FolderTree } from 'lucide-react'
import { Button, EmptyState, Skeleton, useI18n, usePermissions } from 'archon-ui'
import PageHeader from '../../components/PageHeader'
import { useCatalog } from '../../lib/catalog'
import { fillTemplate } from '../../lib/format'
import NotFound from '../NotFound'

export default function ProductPage() {
  const { product = '' } = useParams()
  const { t } = useI18n()
  const navigate = useNavigate()
  const { hasCapability } = usePermissions()
  const { summaries, findProduct, loading } = useCatalog()

  const entity = findProduct(product)
  const modules = summaries.filter((item) => item.product === product)

  if (loading && !entity && modules.length === 0) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4 p-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (!entity && modules.length === 0) {
    return <NotFound />
  }

  const name = entity?.name ?? modules[0]?.productName ?? product
  const total = modules.reduce((sum, item) => sum + item.documentCount, 0)

  return (
    <div className="mx-auto w-full max-w-5xl p-6">
      <PageHeader
        title={name}
        subtitle={entity?.description ?? undefined}
        eyebrow={<Link to="/" className="hover:text-foreground">{t('web.nav.home')}</Link>}
        actions={
          <>
            {entity?.repository && (
              <Button variant="outline" size="sm" icon={<ExternalLink />} onClick={() => window.open(`https://github.com/${entity.repository}`, '_blank', 'noopener')}>
                {t('web.product.repository')}
              </Button>
            )}
            {hasCapability('documentos.editar') && (
              <Button size="sm" icon={<FilePlus2 />} onClick={() => navigate(`/docs/novo?produto=${product}`)}>
                {t('web.home.newDocument')}
              </Button>
            )}
          </>
        }
      />

      <p className="mb-4 text-sm text-muted-foreground">{fillTemplate(t('web.home.counts'), modules.length, total)}</p>

      {modules.length === 0 ? (
        <EmptyState icon={<FolderTree size={36} />} title={t('web.product.noModules.title')} description={t('web.product.noModules.description')} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {modules.map((item) => (
            <Link key={item.module} to={`/produtos/${product}/${item.module}`} className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold group-hover:text-primary">{item.moduleName}</h3>
                <ArrowRight size={16} className="mt-1 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted-foreground">{item.description || t('web.home.noDescription')}</p>
              <p className="mt-4 text-xs text-muted-foreground">{fillTemplate(t('web.module.documents'), item.documentCount)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
