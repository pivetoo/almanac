import { useMemo, useState } from 'react'
import { History as HistoryIcon } from 'lucide-react'
import { EmptyState, Skeleton, useI18n } from 'archon-ui'
import MarkdownView from '../../components/MarkdownView'
import { StatusBadge } from '../../components/Badges'
import { diffLines } from '../../lib/diff'
import { fillTemplate, formatDateTime } from '../../lib/format'
import { useQuery } from '../../lib/useQuery'
import { documentService } from '../../services/documentService'
import type { DocumentEntity, DocumentVersionEntity } from '../../types/almanac'

interface Entry {
  number: number
  title: string
  body: string
  status: DocumentVersionEntity['status']
  date: string
  current: boolean
}

export default function History({ document }: { document: DocumentEntity }) {
  const { t, culture } = useI18n()
  const versions = useQuery<DocumentVersionEntity[]>(() => documentService.versions(document.id), [document.id, document.version])
  const [selected, setSelected] = useState<number | null>(null)
  const [mode, setMode] = useState<'diff' | 'text'>('diff')

  const entries = useMemo<Entry[]>(() => {
    const past = (versions.data ?? []).map((item) => ({ number: item.number, title: item.title, body: item.body, status: item.status, date: item.createdAt, current: false }))
    const current: Entry = { number: document.version, title: document.title, body: document.body, status: document.status, date: document.updatedAt ?? document.createdAt, current: true }
    return [current, ...past.sort((a, b) => b.number - a.number)]
  }, [versions.data, document])

  if (versions.loading) {
    return <Skeleton className="h-48 w-full" />
  }

  if (entries.length === 1) {
    return <EmptyState icon={<HistoryIcon size={36} />} title={t('web.history.empty.title')} description={t('web.history.empty.description')} />
  }

  const active = entries.find((item) => item.number === (selected ?? entries[0].number)) ?? entries[0]
  const previous = entries.find((item) => item.number < active.number)
  const lines = previous ? diffLines(previous.body, active.body) : []

  return (
    <div className="grid gap-6 md:grid-cols-[14rem_minmax(0,1fr)]">
      <ol className="space-y-1.5">
        {entries.map((entry) => (
          <li key={entry.number}>
            <button type="button" onClick={() => setSelected(entry.number)} aria-current={entry.number === active.number} className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${entry.number === active.number ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
              <p className="font-medium">{fillTemplate(t('web.doc.version'), entry.number)}{entry.current ? ` · ${t('web.history.current')}` : ''}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(entry.date, culture)}</p>
              <div className="mt-1.5"><StatusBadge status={entry.status} /></div>
            </button>
          </li>
        ))}
      </ol>

      <div className="min-w-0">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{previous ? fillTemplate(t('web.history.changes'), active.number, previous.number) : t('web.history.first')}</p>
          <div className="flex items-center gap-0.5 rounded-md bg-muted p-0.5">
            {(['diff', 'text'] as const).map((item) => (
              <button key={item} type="button" onClick={() => setMode(item)} aria-pressed={mode === item} className={`rounded px-2.5 py-1 text-xs font-medium ${mode === item ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>
                {t(item === 'diff' ? 'web.history.mode.diff' : 'web.history.mode.text')}
              </button>
            ))}
          </div>
        </div>

        {mode === 'diff' && previous ? (
          <pre className="max-h-[36rem] overflow-auto rounded-lg border border-border bg-card p-3 font-mono text-xs leading-relaxed">
            {lines.map((line, index) => (
              <div key={index} className={line.kind === 'added' ? 'bg-success/15' : line.kind === 'removed' ? 'bg-destructive/15 text-muted-foreground line-through decoration-destructive/40' : 'text-muted-foreground'}>
                <span className="mr-2 inline-block w-3 select-none">{line.kind === 'added' ? '+' : line.kind === 'removed' ? '-' : ' '}</span>
                {line.text || ' '}
              </div>
            ))}
          </pre>
        ) : (
          <div className="rounded-lg border border-border bg-card p-4">
            <MarkdownView source={active.body} />
          </div>
        )}
      </div>
    </div>
  )
}
