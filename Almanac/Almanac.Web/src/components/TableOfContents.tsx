import { useEffect, useState } from 'react'
import { useI18n } from 'archon-ui'

interface Heading {
  id: string
  text: string
  level: number
}

interface TableOfContentsProps {
  containerSelector: string
  refreshKey: unknown
}

function readHeadings(containerSelector: string): Heading[] {
  const container = document.querySelector(containerSelector)
  const nodes = container ? Array.from(container.querySelectorAll<HTMLHeadingElement>('h2, h3')) : []
  return nodes.filter((node) => node.id).map((node) => ({ id: node.id, text: node.textContent ?? '', level: Number(node.tagName.slice(1)) }))
}

export default function TableOfContents({ containerSelector, refreshKey }: TableOfContentsProps) {
  const { t } = useI18n()
  const [headings, setHeadings] = useState<Heading[]>([])
  const [activeId, setActiveId] = useState('')

  useEffect(() => {
    const frame = requestAnimationFrame(() => setHeadings(readHeadings(containerSelector)))
    const container = document.querySelector(containerSelector)
    const observer = new MutationObserver(() => setHeadings(readHeadings(containerSelector)))

    if (container) {
      observer.observe(container, { childList: true, subtree: true })
    }

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [containerSelector, refreshKey])

  useEffect(() => {
    if (headings.length === 0) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

        if (visible.length > 0) {
          setActiveId(visible[0].target.id)
        }
      },
      { rootMargin: '-80px 0px -65% 0px' }
    )

    headings.forEach((heading) => {
      const node = document.getElementById(heading.id)

      if (node) {
        observer.observe(node)
      }
    })

    return () => observer.disconnect()
  }, [headings])

  if (headings.length < 2) {
    return null
  }

  return (
    <nav aria-label={t('web.doc.toc')} className="text-sm">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('web.doc.toc')}</p>
      <ul className="space-y-1 border-l border-border">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              onClick={(event) => {
                event.preventDefault()
                document.getElementById(heading.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                setActiveId(heading.id)
              }}
              className={`-ml-px block border-l py-0.5 transition-colors ${heading.level === 3 ? 'pl-6' : 'pl-3'} ${activeId === heading.id ? 'border-primary font-medium text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
