import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  eyebrow?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}

export default function PageHeader({ title, subtitle, eyebrow, actions, children }: PageHeaderProps) {
  return (
    <header className="mb-6">
      {eyebrow && <div className="mb-2 text-xs text-muted-foreground">{eyebrow}</div>}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  )
}
