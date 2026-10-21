import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { useI18n } from 'archon-ui'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
  id?: string
}

function normalize(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, '-')
}

export default function TagInput({ value, onChange, suggestions = [], id }: TagInputProps) {
  const { t } = useI18n()
  const [draft, setDraft] = useState('')

  const add = (raw: string) => {
    const tag = normalize(raw)

    if (tag && !value.includes(tag)) {
      onChange([...value, tag])
    }

    setDraft('')
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      add(draft)
    } else if (event.key === 'Backspace' && !draft && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  const remaining = suggestions.filter((item) => !value.includes(item)).slice(0, 8)

  return (
    <div>
      <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-card px-2 py-1.5 focus-within:ring-[3px] focus-within:ring-ring/25">
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {tag}
            <button type="button" onClick={() => onChange(value.filter((item) => item !== tag))} aria-label={`${t('web.common.remove')} ${tag}`}>
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => add(draft)}
          placeholder={value.length === 0 ? t('web.editor.tags.placeholder') : ''}
          className="min-w-[8rem] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {remaining.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{t('web.editor.tags.suggestions')}</span>
          {remaining.map((tag) => (
            <button key={tag} type="button" onClick={() => add(tag)} className="rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-primary">
              + {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
