import { useState } from 'react'
import { Button, FormField, Input, Modal, ModalContent, ModalFooter, ModalHeader, ModalTitle, Switch, Textarea, useApi, useI18n } from 'archon-ui'
import { moduleService } from '../../services/catalogService'
import { slugify, slugPattern } from '../../lib/slug'
import type { ModuleEntity, Product } from '../../types/almanac'

interface ModuleModalProps {
  open: boolean
  item?: ModuleEntity
  productId?: number
  products: Product[]
  onClose: () => void
  onSaved: () => void
}

type Errors = { product?: string; name?: string; slug?: string }

const selectClass = 'h-9 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:border-primary focus:ring-[3px] focus:ring-ring/25 disabled:opacity-60'

// O conteúdo do modal só é montado enquanto ele está aberto, então o estado nasce novo a cada abertura.
function ModuleForm({ item, productId, products, onClose, onSaved }: Omit<ModuleModalProps, 'open'>) {
  const { t } = useI18n()
  const api = useApi({ showSuccessMessage: true })
  const [product, setProduct] = useState(item?.productId ?? productId ?? 0)
  const [name, setName] = useState(item?.name ?? '')
  const [slug, setSlug] = useState(item?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(Boolean(item))
  const [description, setDescription] = useState(item?.description ?? '')
  const [sourcePath, setSourcePath] = useState(item?.sourcePath ?? '')
  const [isActive, setIsActive] = useState(item?.isActive ?? true)
  const [errors, setErrors] = useState<Errors>({})

  const submit = async () => {
    const next: Errors = {}

    if (!product) {
      next.product = t('web.catalog.error.product')
    }

    if (name.trim().length < 2) {
      next.name = t('web.catalog.error.name')
    }

    if (!slugPattern.test(slug) || slug.length < 2) {
      next.slug = t('web.catalog.error.slug')
    }

    setErrors(next)

    if (Object.keys(next).length > 0) {
      return
    }

    const payload = { productId: product, slug, name: name.trim(), description: description.trim() || undefined, sourcePath: sourcePath.trim() || undefined }
    const result = await api.execute(() => (item ? moduleService.update(item.id, { ...payload, isActive }) : moduleService.create(payload)))

    if (result) {
      onSaved()
      onClose()
    }
  }

  return (
    <>
      <ModalHeader>
        <ModalTitle>{item ? t('web.catalog.editModule') : t('web.catalog.newModule')}</ModalTitle>
      </ModalHeader>
      <div className="space-y-4">
        <FormField label={t('web.catalog.field.product')} htmlFor="module-product" required error={errors.product}>
          <select id="module-product" className={selectClass} value={product} disabled={Boolean(item)} onChange={(event) => setProduct(Number(event.target.value))}>
            <option value={0}>{t('web.editor.select')}</option>
            {products.map((entry) => (
              <option key={entry.id} value={entry.id}>{entry.name}</option>
            ))}
          </select>
        </FormField>
        <FormField label={t('web.catalog.field.name')} htmlFor="module-name" required error={errors.name}>
          <Input
            id="module-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value)

              if (!slugTouched) {
                setSlug(slugify(event.target.value))
              }
            }}
          />
        </FormField>
        <FormField label={t('web.catalog.field.slug')} htmlFor="module-slug" required error={errors.slug} helperText={t('web.catalog.field.slugHelp')}>
          <Input id="module-slug" value={slug} onChange={(event) => { setSlugTouched(true); setSlug(event.target.value) }} />
        </FormField>
        <FormField label={t('web.catalog.field.description')} htmlFor="module-description" helperText={t('web.catalog.field.moduleDescriptionHelp')}>
          <Textarea id="module-description" rows={3} maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} />
        </FormField>
        <FormField label={t('web.catalog.field.sourcePath')} htmlFor="module-source" helperText={t('web.catalog.field.sourcePathHelp')}>
          <Input id="module-source" value={sourcePath} onChange={(event) => setSourcePath(event.target.value)} />
        </FormField>
        {item && (
          <label className="flex items-center gap-3 text-sm">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            {t('web.catalog.field.active')}
          </label>
        )}
      </div>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>{t('web.common.cancel')}</Button>
        <Button loading={api.isLoading} onClick={submit}>{t('web.common.save')}</Button>
      </ModalFooter>
    </>
  )
}

export default function ModuleModal({ open, item, productId, products, onClose, onSaved }: ModuleModalProps) {
  return (
    <Modal open={open} onOpenChange={(next) => !next && onClose()}>
      <ModalContent size="lg">
        <ModuleForm item={item} productId={productId} products={products} onClose={onClose} onSaved={onSaved} />
      </ModalContent>
    </Modal>
  )
}
