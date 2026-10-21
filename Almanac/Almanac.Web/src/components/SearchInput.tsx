import { useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { useI18n } from 'archon-ui'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit?: () => void
  placeholder?: string
  size?: 'md' | 'lg'
  autoFocus?: boolean
}

export default function SearchInput({ value, onChange, onSubmit, placeholder, size = 'md', autoFocus = false }: SearchInputProps) {
  const { t } = useI18n()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)

      if (event.key === '/' && !typing && !event.ctrlKey && !event.metaKey) {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const large = size === 'lg'

  return (
    <div className={`relative w-full ${large ? 'max-w-2xl' : ''}`}>
      <Search size={large ? 20 : 16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        value={value}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            onSubmit?.()
          }
        }}
        placeholder={placeholder ?? t('web.search.placeholder')}
        aria-label={t('web.search.title')}
        className={`w-full rounded-xl border border-input bg-card pl-11 pr-20 text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-[3px] focus:ring-ring/25 placeholder:text-muted-foreground ${large ? 'h-14 text-lg' : 'h-10 text-sm'}`}
      />
      <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
        {value && (
          <button type="button" onClick={() => onChange('')} aria-label={t('web.search.clear')} className="text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        )}
        {!value && <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">/</kbd>}
      </div>
    </div>
  )
}
