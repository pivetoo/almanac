import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, CalendarClock, ExternalLink, FileCode2, Link2, Pencil, Trash2 } from 'lucide-react'
import { Button, ConfirmModal, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger, toast, useApi, useI18n, usePermissions } from 'archon-ui'
import { StatusBadge, TypeBadge } from '../../components/Badges'
import MarkdownView from '../../components/MarkdownView'
import TableOfContents from '../../components/TableOfContents'
import { statusHintKey, statusLabelKey, documentStatuses, githubSourceUrl } from '../../lib/docMeta'
import { formatDateTime, fillTemplate } from '../../lib/format'
import { useCatalog } from '../../lib/catalog'
import { useQuery } from '../../lib/useQuery'
import { documentService } from '../../services/documentService'
import { DocumentStatus } from '../../types/almanac'
import type { DocumentEntity, DocumentStatusValue } from '../../types/almanac'
import NotFound from '../NotFound'
import History from './History'

export default function DocumentView() {
  const { id } = useParams()
  const documentId = Number(id)
  const { t, culture } = useI18n()
  const navigate = useNavigate()
  const { hasCapability } = usePermissions()
  const { reload: reloadCatalog } = useCatalog()
  const api = useApi({ showSuccessMessage: true })
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [tab, setTab] = useState('document')

  const document = useQuery<DocumentEntity>(() => documentService.getById(documentId), [documentId], { enabled: Number.isFinite(documentId) && documentId > 0 })
  const entity = document.data

  if (document.loading && !entity) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 p-6">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!entity) {
    return <NotFound />
  }

  const product = entity.module?.product
  const module = entity.module
  const source = githubSourceUrl(entity.sourceRepository, entity.sourcePath, entity.sourceCommit)
  const canEdit = hasCapability('documentos.editar')
  const canReview = hasCapability('documentos.revisar')
  const canDelete = hasCapability('documentos.excluir')

  const copy = async (text: string, message: string) => {
    await navigator.clipboard.writeText(text)
    toast({ title: message, variant: 'success' })
  }

  const changeStatus = async (status: DocumentStatusValue) => {
    const result = await api.execute(() => documentService.setStatus(entity.id, status))

    if (result) {
      document.reload()
    }
  }

  const remove = async () => {
    const result = await api.execute(() => documentService.remove(entity.id))

    if (result) {
      reloadCatalog()
      navigate(product && module ? `/produtos/${product.slug}/${module.slug}` : '/')
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 p-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <article className="min-w-0">
        <p className="mb-2 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">{t('web.nav.home')}</Link>
          <span>/</span>
          {product && <Link to={`/produtos/${product.slug}`} className="hover:text-foreground">{product.name}</Link>}
          <span>/</span>
          {product && module && <Link to={`/produtos/${product.slug}/${module.slug}`} className="hover:text-foreground">{module.name}</Link>}
        </p>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <TypeBadge type={entity.type} />
          <StatusBadge status={entity.status} />
          <span className="text-xs text-muted-foreground">{fillTemplate(t('web.doc.version'), entity.version)}</span>
        </div>

        <h1 className="text-3xl font-semibold tracking-tight">{entity.title}</h1>
        <p className="mt-3 text-lg leading-relaxed text-muted-foreground">{entity.summary}</p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {canEdit && (
            <Button size="sm" icon={<Pencil />} onClick={() => navigate(`/docs/${entity.id}/editar`)}>
              {t('web.common.edit')}
            </Button>
          )}
          <Button size="sm" variant="outline" icon={<Link2 />} onClick={() => copy(window.location.href, t('web.doc.linkCopied'))}>
            {t('web.doc.copyLink')}
          </Button>
          <Button size="sm" variant="outline" icon={<FileCode2 />} onClick={() => copy(`# ${entity.title}\n\n${entity.body}`, t('web.doc.markdownCopied'))}>
            {t('web.doc.copyMarkdown')}
          </Button>
          {canDelete && (
            <Button size="sm" variant="outline-danger" icon={<Trash2 />} onClick={() => setConfirmDelete(true)}>
              {t('web.common.delete')}
            </Button>
          )}
        </div>

        {entity.status !== DocumentStatus.Reviewed && (
          <div role="status" className={`mt-5 flex items-start gap-3 rounded-lg border p-3 text-sm ${entity.status === DocumentStatus.Outdated ? 'border-destructive/40 bg-destructive/10' : 'border-warning/40 bg-warning/10'}`}>
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">{t(statusLabelKey[entity.status])}</p>
              <p className="text-muted-foreground">{t(statusHintKey[entity.status])}</p>
            </div>
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab} className="mt-6">
          <TabsList variant="underline">
            <TabsTrigger value="document">{t('web.doc.tab.document')}</TabsTrigger>
            <TabsTrigger value="history">{t('web.doc.tab.history')}</TabsTrigger>
          </TabsList>
          <TabsContent value="document" className="pt-6">
            <div id="document-body">
              <MarkdownView source={entity.body.replace(/^\s*#\s+.*\n+/, '')} />
            </div>
          </TabsContent>
          <TabsContent value="history" className="pt-6">
            <History document={entity} />
          </TabsContent>
        </Tabs>
      </article>

      <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
        <div className="space-y-4 rounded-xl border border-border bg-card p-4 text-sm">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('web.doc.meta.updated')}</p>
            <p className="flex items-center gap-2">
              <CalendarClock size={14} className="text-muted-foreground" />
              {formatDateTime(entity.updatedAt ?? entity.createdAt, culture)}
            </p>
          </div>

          {canReview && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('web.doc.meta.status')}</p>
              <div className="flex flex-col gap-1.5">
                {documentStatuses.map((item) => (
                  <Button key={item} size="sm" variant={entity.status === item ? 'secondary' : 'outline'} disabled={entity.status === item} loading={api.isLoading} onClick={() => changeStatus(item)}>
                    {t(statusLabelKey[item])}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {entity.tags.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('web.doc.meta.tags')}</p>
              <div className="flex flex-wrap gap-1.5">
                {entity.tags.map((tag) => (
                  <Link key={tag} to={`/buscar?tag=${encodeURIComponent(tag)}`} className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary">
                    {tag}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {(entity.sourcePath || entity.sourceRepository) && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('web.doc.meta.source')}</p>
              <p className="break-all font-mono text-xs text-muted-foreground">{entity.sourcePath ?? entity.sourceRepository}</p>
              {entity.sourceCommit && <p className="mt-1 font-mono text-xs text-muted-foreground">{entity.sourceCommit}</p>}
              {source && (
                <a href={source} target="_blank" rel="noreferrer noopener" className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  <ExternalLink size={12} />
                  {t('web.doc.meta.openSource')}
                </a>
              )}
            </div>
          )}
        </div>

        {tab === 'document' && <TableOfContents containerSelector="#document-body" refreshKey={entity.id + entity.version} />}
      </aside>

      <ConfirmModal
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t('web.doc.delete.title')}
        description={fillTemplate(t('web.doc.delete.description'), entity.title)}
        confirmText={t('web.common.delete')}
        cancelText={t('web.common.cancel')}
        variant="danger"
        loading={api.isLoading}
        onConfirm={remove}
      />
    </div>
  )
}
