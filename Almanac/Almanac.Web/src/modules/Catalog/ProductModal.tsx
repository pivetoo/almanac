import { useState } from 'react'
import { Button, FormField, Input, Modal, ModalContent, ModalFooter, ModalHeader, ModalTitle, Switch, Textarea, useApi, useI18n } from 'archon-ui'
import { productService } from '../../services/catalogService'
import { slugify, slugPattern } from '../../lib/slug'
import type { Product } from '../../types/almanac'

interface ProductModalProps {
  open: boolean
  item?: Product
  onClose: () => void
  onSaved: () => void
}

type Errors = { name?: string; slug?: string }

// O conteúdo do modal só é montado enquanto ele está aberto, então o estado nasce novo a cada abertura.
function ProductForm({ item, onClose, onSaved }: Omit<ProductModalProps, 'open'>) {
  const { t } = useI18n()
  const api = useApi({ showSuccessMessage: true })
  const [name, setName] = useState(item?.name ?? '')
  const [slug, setSlug] = useState(item?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(Boolean(item))
  const [description, setDescription] = useState(item?.description ?? '')
  const [repository, setRepository] = useState(item?.repository ?? '')
  const [isActive, setIsActive] = useState(item?.isActive ?? true)
  const [errors, setErrors] = useState<Errors>({})

  const submit = async () => {
    const next: Errors = {}

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

    const payload = { slug, name: name.trim(), description: description.trim() || undefined, repository: repository.trim() || undefined }
    const result = await api.execute(() => (item ? productService.update(item.id, { ...payload, isActive }) : productService.create(payload)))

    if (result) {
      onSaved()
      onClose()
    }
  }

  return (
    <>
      <ModalHeader>
        <ModalTitle>{item ? t('web.catalog.editProduct') : t('web.catalog.newProduct')}</ModalTitle>
      </ModalHeader>
      <div className="space-y-4">
        <FormField label={t('web.catalog.field.name')} htmlFor="product-name" required error={errors.name}>
          <Input
            id="product-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value)

              if (!slugTouched) {
                setSlug(slugify(event.target.value))
              }
            }}
          />
        </FormField>
        <FormField label={t('web.catalog.field.slug')} htmlFor="product-slug" required error={errors.slug} helperText={t('web.catalog.field.slugHelp')}>
          <Input id="product-slug" value={slug} disabled={Boolean(item)} onChange={(event) => { setSlugTouched(true); setSlug(event.target.value) }} />
        </FormField>
        <FormField label={t('web.catalog.field.description')} htmlFor="product-description">
          <Textarea id="product-description" rows={3} maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} />
        </FormField>
        <FormField label={t('web.catalog.field.repository')} htmlFor="product-repository" helperText={t('web.catalog.field.repositoryHelp')}>
          <Input id="product-repository" value={repository} onChange={(event) => setRepository(event.target.value)} />
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

export default function ProductModal({ open, item, onClose, onSaved }: ProductModalProps) {
  return (
    <Modal open={open} onOpenChange={(next) => !next && onClose()}>
      <ModalContent size="lg">
        <ProductForm item={item} onClose={onClose} onSaved={onSaved} />
      </ModalContent>
    </Modal>
  )
}
