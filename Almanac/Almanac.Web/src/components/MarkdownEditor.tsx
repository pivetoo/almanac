import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Bold, Code, Code2, Eye, Heading2, Italic, Link2, List, ListOrdered, PenLine, Quote, Table2 } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, useI18n } from 'archon-ui'
import MarkdownView from './MarkdownView'

type Mode = 'write' | 'preview' | 'split'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  error?: boolean
}

const tableSnippet = '\n| Coluna | Detalhe |\n|---|---|\n| item | descrição |\n'

export default function MarkdownEditor({ value, onChange, error = false }: MarkdownEditorProps) {
  const { t } = useI18n()
  const [mode, setMode] = useState<Mode>('split')
  const [area, setArea] = useState<HTMLTextAreaElement | null>(null)

  const apply = (transform: (selected: string) => { text: string; selectStart?: number; selectEnd?: number }) => {
    if (!area) {
      return
    }

    const { selectionStart, selectionEnd } = area
    const result = transform(value.slice(selectionStart, selectionEnd))
    const next = value.slice(0, selectionStart) + result.text + value.slice(selectionEnd)
    onChange(next)

    requestAnimationFrame(() => {
      area.focus()
      area.setSelectionRange(selectionStart + (result.selectStart ?? result.text.length), selectionStart + (result.selectEnd ?? result.text.length))
    })
  }

  const wrap = (before: string, after: string, placeholder: string) =>
    apply((selected) => {
      const inner = selected || placeholder
      return { text: `${before}${inner}${after}`, selectStart: before.length, selectEnd: before.length + inner.length }
    })

  const linePrefix = (prefix: string, placeholder: string) =>
    apply((selected) => {
      const inner = selected || placeholder
      const text = inner
        .split('\n')
        .map((line, index) => (prefix === '1. ' ? `${index + 1}. ${line}` : `${prefix}${line}`))
        .join('\n')
      return { text, selectStart: 0, selectEnd: text.length }
    })

  const actions = [
    { key: 'bold', icon: Bold, label: t('web.editor.toolbar.bold'), run: () => wrap('**', '**', t('web.editor.toolbar.boldSample')) },
    { key: 'italic', icon: Italic, label: t('web.editor.toolbar.italic'), run: () => wrap('_', '_', t('web.editor.toolbar.italicSample')) },
    { key: 'heading', icon: Heading2, label: t('web.editor.toolbar.heading'), run: () => linePrefix('## ', t('web.editor.toolbar.headingSample')) },
    { key: 'list', icon: List, label: t('web.editor.toolbar.list'), run: () => linePrefix('- ', t('web.editor.toolbar.listSample')) },
    { key: 'ordered', icon: ListOrdered, label: t('web.editor.toolbar.ordered'), run: () => linePrefix('1. ', t('web.editor.toolbar.listSample')) },
    { key: 'quote', icon: Quote, label: t('web.editor.toolbar.quote'), run: () => linePrefix('> ', t('web.editor.toolbar.quoteSample')) },
    { key: 'code', icon: Code, label: t('web.editor.toolbar.code'), run: () => wrap('`', '`', 'codigo') },
    { key: 'block', icon: Code2, label: t('web.editor.toolbar.codeBlock'), run: () => wrap('\n```\n', '\n```\n', 'codigo') },
    { key: 'link', icon: Link2, label: t('web.editor.toolbar.link'), run: () => wrap('[', '](https://)', t('web.editor.toolbar.linkSample')) },
    { key: 'table', icon: Table2, label: t('web.editor.toolbar.table'), run: () => apply(() => ({ text: tableSnippet })) }
  ]

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
      event.preventDefault()
      actions[0].run()
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'i') {
      event.preventDefault()
      actions[1].run()
    } else if (event.key === 'Tab') {
      event.preventDefault()
      apply(() => ({ text: '  ' }))
    }
  }

  const modes: { key: Mode; icon: typeof PenLine; label: string }[] = [
    { key: 'write', icon: PenLine, label: t('web.editor.mode.write') },
    { key: 'split', icon: Table2, label: t('web.editor.mode.split') },
    { key: 'preview', icon: Eye, label: t('web.editor.mode.preview') }
  ]

  const showWrite = mode !== 'preview'
  const showPreview = mode !== 'write'

  return (
    <div className={`overflow-hidden rounded-lg border bg-card ${error ? 'border-destructive' : 'border-input'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-2 py-1.5">
        <TooltipProvider delayDuration={200}>
          <div className="flex flex-wrap items-center gap-0.5">
            {actions.map((action) => (
              <Tooltip key={action.key}>
                <TooltipTrigger asChild>
                  <button type="button" onClick={action.run} disabled={!showWrite} aria-label={action.label} className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40">
                    <action.icon size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>{action.label}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
        <div className="flex items-center gap-0.5 rounded-md bg-muted p-0.5">
          {modes.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setMode(item.key)}
              aria-pressed={mode === item.key}
              className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${mode === item.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <item.icon size={14} />
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className={`grid ${showWrite && showPreview ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
        {showWrite && (
          <textarea
            ref={setArea}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck
            aria-label={t('web.editor.body')}
            className="min-h-[28rem] w-full resize-y bg-transparent p-4 font-mono text-sm leading-relaxed outline-none"
          />
        )}
        {showPreview && (
          <div className={`max-h-[40rem] min-h-[28rem] overflow-auto p-4 ${showWrite ? 'border-t border-border lg:border-l lg:border-t-0' : ''}`}>
            {value.trim() ? <MarkdownView source={value} /> : <p className="text-sm text-muted-foreground">{t('web.editor.previewEmpty')}</p>}
          </div>
        )}
      </div>
      <div className="flex justify-between border-t border-border px-3 py-1.5 text-xs text-muted-foreground">
        <span>{t('web.editor.markdownHint')}</span>
        <span>{value.length.toLocaleString()}</span>
      </div>
    </div>
  )
}
