import { useNavigate } from 'react-router-dom'
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { Button, useI18n, usePermissions } from 'archon-ui'
import { TypeBadge } from '../../components/Badges'
import PageHeader from '../../components/PageHeader'
import { documentTypes, typeHintKey, typeLabelKey } from '../../lib/docMeta'
import { documentTemplates } from '../../lib/templates'

const rules = ['small', 'summary', 'title', 'tags', 'source', 'status']

export default function Guide() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { hasCapability } = usePermissions()
  const [copied, setCopied] = useState<number | null>(null)

  const copy = async (type: number) => {
    await navigator.clipboard.writeText(documentTemplates[type as keyof typeof documentTemplates])
    setCopied(type)
    window.setTimeout(() => setCopied(null), 1800)
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-10 p-6">
      <PageHeader title={t('web.guide.title')} subtitle={t('web.guide.subtitle')} />

      <section aria-labelledby="guide-rules">
        <h2 id="guide-rules" className="mb-4 text-lg font-semibold">{t('web.guide.rules.title')}</h2>
        <ol className="space-y-3">
          {rules.map((rule, index) => (
            <li key={rule} className="flex gap-3 rounded-lg border border-border bg-card p-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{index + 1}</span>
              <div>
                <p className="font-medium">{t(`web.guide.rule.${rule}.title`)}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{t(`web.guide.rule.${rule}.description`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="guide-types">
        <h2 id="guide-types" className="mb-4 text-lg font-semibold">{t('web.guide.types.title')}</h2>
        <div className="space-y-4">
          {documentTypes.map((type) => (
            <article key={type} className="rounded-xl border border-border bg-card">
              <header className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div>
                  <TypeBadge type={type} />
                  <p className="mt-2 text-sm text-muted-foreground">{t(typeHintKey[type])}</p>
                  <p className="mt-1 text-sm"><span className="font-medium">{t('web.guide.whenToUse')}</span> {t(`${typeLabelKey[type]}.when`)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" icon={copied === type ? <Check /> : <Copy />} onClick={() => copy(type)}>
                    {copied === type ? t('web.common.copied') : t('web.guide.copyTemplate')}
                  </Button>
                  {hasCapability('documentos.editar') && (
                    <Button size="sm" onClick={() => navigate(`/docs/novo?tipo=${type}`)}>{t('web.guide.useTemplate')}</Button>
                  )}
                </div>
              </header>
              <pre className="max-h-64 overflow-auto border-t border-border bg-muted/40 p-4 font-mono text-xs leading-relaxed">{documentTemplates[type]}</pre>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
