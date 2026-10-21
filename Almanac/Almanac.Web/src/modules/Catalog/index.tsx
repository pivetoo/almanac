import { useState } from 'react'
import { Cpu, FolderTree, Layers, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { Badge, Button, ConfirmModal, EmptyState, Skeleton, useApi, useI18n, usePermissions } from 'archon-ui'
import PageHeader from '../../components/PageHeader'
import { useCatalog } from '../../lib/catalog'
import { fillTemplate } from '../../lib/format'
import { useQuery } from '../../lib/useQuery'
import { documentService } from '../../services/documentService'
import { moduleService, productService } from '../../services/catalogService'
import type { DocumentStats, ModuleEntity, Product } from '../../types/almanac'
import ModuleModal from './ModuleModal'
import ProductModal from './ProductModal'

type Target = { kind: 'product'; item: Product } | { kind: 'module'; item: ModuleEntity }

export default function Catalog() {
  const { t } = useI18n()
  const { hasCapability } = usePermissions()
  const { products, modules, summaries, loading, reload } = useCatalog()
  const api = useApi({ showSuccessMessage: true })
  const canEdit = hasCapability('catalogo.editar')
  const canDelete = hasCapability('catalogo.excluir')
  const canIndex = hasCapability('documentos.editar')

  const [productModal, setProductModal] = useState<{ open: boolean; item?: Product }>({ open: false })
  const [moduleModal, setModuleModal] = useState<{ open: boolean; item?: ModuleEntity; productId?: number }>({ open: false })
  const [removing, setRemoving] = useState<Target | null>(null)
  const stats = useQuery<DocumentStats>(() => documentService.stats(), [])

  const documentCount = (product: string, module: string) => summaries.find((item) => item.product === product && item.module === module)?.documentCount ?? 0

  const remove = async () => {
    if (!removing) {
      return
    }

    const result = await api.execute(() => (removing.kind === 'product' ? productService.remove(removing.item.id) : moduleService.remove(removing.item.id)))

    if (result) {
      setRemoving(null)
      reload()
    }
  }

  const reindex = async () => {
    const result = await api.execute(() => documentService.reindex())

    if (result) {
      stats.reload()
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 p-6">
      <PageHeader
        title={t('web.catalog.title')}
        subtitle={t('web.catalog.subtitle')}
        actions={
          canEdit && (
            <Button icon={<Plus />} onClick={() => setProductModal({ open: true })}>
              {t('web.catalog.newProduct')}
            </Button>
          )
        }
      />

      {loading && products.length === 0 ? (
        <Skeleton className="h-48 w-full" />
      ) : products.length === 0 ? (
        <EmptyState icon={<Layers size={36} />} title={t('web.home.noProducts.title')} description={t('web.catalog.empty')} />
      ) : (
        <div className="space-y-5">
          {products.map((product) => {
            const productModules = modules.filter((item) => item.productId === product.id)

            return (
              <section key={product.id} className="rounded-xl border border-border bg-card">
                <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold">{product.name}</h2>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{product.slug}</code>
                      {!product.isActive && <Badge variant="soft-neutral">{t('web.catalog.inactive')}</Badge>}
                    </div>
                    {product.description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{product.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {canEdit && (
                      <>
                        <Button size="sm" variant="outline" icon={<Plus />} onClick={() => setModuleModal({ open: true, productId: product.id })}>
                          {t('web.catalog.newModule')}
                        </Button>
                        <Button size="icon" variant="ghost"icon={<Pencil />} aria-label={t('web.common.edit')} tooltip={t('web.common.edit')} onClick={() => setProductModal({ open: true, item: product })} />
                      </>
                    )}
                    {canDelete && <Button size="icon" variant="ghost"icon={<Trash2 />} aria-label={t('web.common.delete')} tooltip={t('web.common.delete')} onClick={() => setRemoving({ kind: 'product', item: product })} />}
                  </div>
                </header>

                {productModules.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">{t('web.catalog.noModules')}</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {productModules.map((module) => (
                      <li key={module.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <FolderTree size={14} className="text-muted-foreground" />
                            <span className="text-sm font-medium">{module.name}</span>
                            <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{module.slug}</code>
                            {!module.isActive && <Badge variant="soft-neutral">{t('web.catalog.inactive')}</Badge>}
                          </div>
                          {module.description && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{module.description}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{fillTemplate(t('web.module.documents'), documentCount(product.slug, module.slug))}</span>
                          {canEdit && <Button size="icon" variant="ghost"icon={<Pencil />} aria-label={t('web.common.edit')} tooltip={t('web.common.edit')} onClick={() => setModuleModal({ open: true, item: module })} />}
                          {canDelete && <Button size="icon" variant="ghost"icon={<Trash2 />} aria-label={t('web.common.delete')} tooltip={t('web.common.delete')} onClick={() => setRemoving({ kind: 'module', item: module })} />}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
      )}

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold"><Cpu size={18} />{t('web.catalog.indexing.title')}</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t('web.catalog.indexing.description')}</p>
            <div className="mt-3">
              {stats.loading ? <Skeleton className="h-6 w-40" /> : stats.data?.semanticSearch ? <Badge variant="soft-success" dot>{t('web.catalog.indexing.on')}</Badge> : <Badge variant="soft-neutral" dot>{t('web.catalog.indexing.off')}</Badge>}
            </div>
          </div>
          {canIndex && stats.data?.semanticSearch && (
            <Button variant="outline" icon={<RefreshCw />} loading={api.isLoading} onClick={reindex}>
              {t('web.catalog.indexing.reindex')}
            </Button>
          )}
        </div>
      </section>

      <ProductModal open={productModal.open} item={productModal.item} onClose={() => setProductModal({ open: false })} onSaved={reload} />
      <ModuleModal open={moduleModal.open} item={moduleModal.item} productId={moduleModal.productId} products={products} onClose={() => setModuleModal({ open: false })} onSaved={reload} />

      <ConfirmModal
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={removing?.kind === 'product' ? t('web.catalog.deleteProduct.title') : t('web.catalog.deleteModule.title')}
        description={removing ? fillTemplate(removing.kind === 'product' ? t('web.catalog.deleteProduct.description') : t('web.catalog.deleteModule.description'), removing.item.name) : ''}
        confirmText={t('web.common.delete')}
        cancelText={t('web.common.cancel')}
        variant="danger"
        loading={api.isLoading}
        onConfirm={remove}
      />
    </div>
  )
}
