import { useEffect, useMemo, useRef, useState } from 'react'
import { useBlocker, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronDown, ChevronUp, FileText, Save, Wand2 } from 'lucide-react'
import { Button, ConfirmModal, FormField, Input, Skeleton, Textarea, useApi, useI18n } from 'archon-ui'
import MarkdownEditor from '../../components/MarkdownEditor'
import TagInput from '../../components/TagInput'
import { useCatalog } from '../../lib/catalog'
import { documentTypes, typeHintKey, typeIcon, typeLabelKey } from '../../lib/docMeta'
import { fillTemplate } from '../../lib/format'
import { documentTemplates } from '../../lib/templates'
import { useQuery } from '../../lib/useQuery'
import { documentService } from '../../services/documentService'
import { DocumentType } from '../../types/almanac'
import type { DocumentEntity, DocumentPayload, DocumentSearchHit, DocumentTypeValue } from '../../types/almanac'

interface FormState {
  product: string
  module: string
  type: DocumentTypeValue
  title: string
  summary: string
  body: string
  tags: string[]
  sourceRepository: string
  sourcePath: string
  sourceCommit: string
}

type Errors = Partial<Record<'product' | 'module' | 'title' | 'summary' | 'body', string>>

const emptyForm: FormState = { product: '', module: '', type: DocumentType.Overview, title: '', summary: '', body: '', tags: [], sourceRepository: '', sourcePath: '', sourceCommit: '' }
const selectClass = 'h-9 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:border-primary focus:ring-[3px] focus:ring-ring/25 disabled:opacity-60'

function fromEntity(entity: DocumentEntity): FormState {
  return {
    product: entity.module?.product?.slug ?? '',
    module: entity.module?.slug ?? '',
    type: entity.type,
    title: entity.title,
    summary: entity.summary,
    body: entity.body,
    tags: entity.tags,
    sourceRepository: entity.sourceRepository ?? '',
    sourcePath: entity.sourcePath ?? '',
    sourceCommit: entity.sourceCommit ?? ''
  }
}

export default function DocumentEditor() {
  const { id } = useParams()
  const editingId = id ? Number(id) : null
  const { t } = useI18n()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { summaries, reload: reloadCatalog } = useCatalog()
  const api = useApi({ showSuccessMessage: true })

  const existing = useQuery<DocumentEntity>(() => documentService.getById(editingId ?? 0), [editingId], { enabled: editingId !== null })
  const known = useQuery<DocumentSearchHit[]>(() => documentService.search({ limit: 50, sort: 'recent' }), [])

  const [form, setForm] = useState<FormState>(() => {
    const requested = Number(params.get('tipo')) as DocumentTypeValue
    const type = documentTypes.includes(requested) ? requested : DocumentType.Overview
    return { ...emptyForm, type, body: documentTypes.includes(requested) ? documentTemplates[type] : '', product: params.get('produto') ?? '', module: params.get('modulo') ?? '' }
  })
  const [errors, setErrors] = useState<Errors>({})
  const [dirty, setDirty] = useState(false)
  const [showSource, setShowSource] = useState(false)
  const [confirmTemplate, setConfirmTemplate] = useState(false)
  const loadedFor = useRef<number | null>(null)

  useEffect(() => {
    if (existing.data && loadedFor.current !== existing.data.id) {
      loadedFor.current = existing.data.id
      setForm(fromEntity(existing.data))
      setShowSource(Boolean(existing.data.sourcePath || existing.data.sourceRepository))
      setDirty(false)
    }
  }, [existing.data])

  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname)

  useEffect(() => {
    if (!dirty) {
      return
    }

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const products = useMemo(() => {
    const map = new Map<string, string>()
    summaries.forEach((item) => map.set(item.product, item.productName))
    return Array.from(map.entries())
  }, [summaries])

  const modules = summaries.filter((item) => item.product === form.product)
  const tagSuggestions = useMemo(() => {
    const counts = new Map<string, number>()
    ;(known.data ?? []).forEach((hit) => hit.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1)))
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([tag]) => tag)
  }, [known.data])

  const change = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
    setDirty(true)
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const validate = (): boolean => {
    const next: Errors = {}

    if (!form.product) {
      next.product = t('web.editor.error.product')
    }

    if (!form.module) {
      next.module = t('web.editor.error.module')
    }

    if (form.title.trim().length < 2) {
      next.title = t('web.editor.error.title')
    }

    if (form.summary.trim().length < 10) {
      next.summary = t('web.editor.error.summary')
    }

    if (!form.body.trim()) {
      next.body = t('web.editor.error.body')
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const save = async () => {
    if (!validate()) {
      return
    }

    const payload: DocumentPayload = {
      product: form.product,
      module: form.module,
      type: form.type,
      title: form.title.trim(),
      summary: form.summary.trim(),
      body: form.body,
      tags: form.tags,
      sourceRepository: form.sourceRepository.trim() || undefined,
      sourcePath: form.sourcePath.trim() || undefined,
      sourceCommit: form.sourceCommit.trim() || undefined
    }

    const result = await api.execute(() => (editingId ? documentService.update(editingId, payload) : documentService.create(payload)))

    if (result) {
      setDirty(false)
      reloadCatalog()
      const saved = result as DocumentEntity
      // Adia a navegação para o bloqueio de saída já enxergar dirty = false.
      window.setTimeout(() => navigate(`/docs/${saved.id}`), 0)
    }
  }

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void save()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  const cancel = () => {
    if (editingId) {
      navigate(`/docs/${editingId}`)
    } else {
      navigate(-1)
    }
  }

  const applyTemplate = () => {
    change('body', documentTemplates[form.type])
    setConfirmTemplate(false)
  }

  if (editingId !== null && existing.loading && !existing.data) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4 p-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{editingId ? t('web.editor.editTitle') : t('web.editor.newTitle')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{editingId ? t('web.editor.editSubtitle') : t('web.editor.newSubtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={cancel}>
            {t('web.common.cancel')}
          </Button>
          <Button icon={<Save />} loading={api.isLoading} onClick={save}>
            {t('web.common.save')}
          </Button>
        </div>
      </header>

      <div className="space-y-6">
        <section className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-2">
          <FormField label={t('web.editor.product')} htmlFor="doc-product" required error={errors.product}>
            <select id="doc-product" className={selectClass} value={form.product} onChange={(event) => { change('product', event.target.value); change('module', '') }}>
              <option value="">{t('web.editor.select')}</option>
              {products.map(([slug, name]) => (
                <option key={slug} value={slug}>{name}</option>
              ))}
            </select>
          </FormField>
          <FormField label={t('web.editor.module')} htmlFor="doc-module" required error={errors.module}>
            <select id="doc-module" className={selectClass} value={form.module} disabled={!form.product} onChange={(event) => change('module', event.target.value)}>
              <option value="">{t('web.editor.select')}</option>
              {modules.map((item) => (
                <option key={item.module} value={item.module}>{item.moduleName}</option>
              ))}
            </select>
          </FormField>

          <div className="sm:col-span-2">
            <p className="mb-2 text-sm font-medium">{t('web.editor.type')}</p>
            <div className="grid gap-2 sm:grid-cols-5" role="radiogroup" aria-label={t('web.editor.type')}>
              {documentTypes.map((item) => {
                const Icon = typeIcon[item]
                const active = form.type === item

                return (
                  <button key={item} type="button" role="radio" aria-checked={active} onClick={() => change('type', item)} className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors ${active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
                    <span className="flex items-center gap-1.5 text-sm font-medium"><Icon size={14} />{t(typeLabelKey[item])}</span>
                    <span className="text-xs text-muted-foreground">{t(typeHintKey[item])}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="sm:col-span-2">
            <FormField label={t('web.editor.titleField')} htmlFor="doc-title" required error={errors.title} helperText={t('web.editor.titleHelp')}>
              <Input id="doc-title" value={form.title} maxLength={200} onChange={(event) => change('title', event.target.value)} />
            </FormField>
          </div>
          <div className="sm:col-span-2">
            <FormField label={t('web.editor.summary')} htmlFor="doc-summary" required error={errors.summary} helperText={fillTemplate(t('web.editor.summaryHelp'), form.summary.length)}>
              <Textarea id="doc-summary" rows={3} maxLength={1000} value={form.summary} onChange={(event) => change('summary', event.target.value)} />
            </FormField>
          </div>
          <div className="sm:col-span-2">
            <FormField label={t('web.editor.tags')} htmlFor="doc-tags" helperText={t('web.editor.tags.help')}>
              <TagInput id="doc-tags" value={form.tags} onChange={(tags) => change('tags', tags)} suggestions={tagSuggestions} />
            </FormField>
          </div>
        </section>

        <section>
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{t('web.editor.body')} <span className="text-destructive">*</span></p>
              {errors.body && <p className="text-xs text-destructive">{errors.body}</p>}
            </div>
            <Button variant="outline" size="sm" icon={<Wand2 />} onClick={() => (form.body.trim() ? setConfirmTemplate(true) : applyTemplate())}>
              {t('web.editor.useTemplate')}
            </Button>
          </div>
          <MarkdownEditor value={form.body} onChange={(value) => change('body', value)} error={Boolean(errors.body)} />
        </section>

        <section className="rounded-xl border border-border bg-card">
          <button type="button" onClick={() => setShowSource((current) => !current)} aria-expanded={showSource} className="flex w-full items-center justify-between p-4 text-left">
            <span className="flex items-center gap-2 text-sm font-medium"><FileText size={16} />{t('web.editor.source')}</span>
            {showSource ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showSource && (
            <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-3">
              <FormField label={t('web.editor.source.repository')} htmlFor="doc-repo" helperText={t('web.editor.source.repositoryHelp')}>
                <Input id="doc-repo" value={form.sourceRepository} onChange={(event) => change('sourceRepository', event.target.value)} />
              </FormField>
              <FormField label={t('web.editor.source.path')} htmlFor="doc-path">
                <Input id="doc-path" value={form.sourcePath} onChange={(event) => change('sourcePath', event.target.value)} />
              </FormField>
              <FormField label={t('web.editor.source.commit')} htmlFor="doc-commit">
                <Input id="doc-commit" value={form.sourceCommit} maxLength={64} onChange={(event) => change('sourceCommit', event.target.value)} />
              </FormField>
            </div>
          )}
        </section>

        {editingId && <p className="text-xs text-muted-foreground">{t('web.editor.resetsStatus')}</p>}
      </div>

      <ConfirmModal open={confirmTemplate} onOpenChange={setConfirmTemplate} title={t('web.editor.template.title')} description={t('web.editor.template.description')} confirmText={t('web.editor.template.confirm')} cancelText={t('web.common.cancel')} variant="warning" onConfirm={applyTemplate} />

      <ConfirmModal
        open={blocker.state === 'blocked'}
        onOpenChange={(open) => {
          if (!open && blocker.state === 'blocked') {
            blocker.reset()
          }
        }}
        title={t('web.editor.leave.title')}
        description={t('web.editor.leave.description')}
        confirmText={t('web.editor.leave.confirm')}
        cancelText={t('web.editor.leave.stay')}
        variant="warning"
        onConfirm={() => blocker.state === 'blocked' && blocker.proceed()}
      />
    </div>
  )
}
