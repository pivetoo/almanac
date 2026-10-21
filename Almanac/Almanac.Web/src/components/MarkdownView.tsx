import { useState } from 'react'
import type { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeHighlight from 'rehype-highlight'
import bash from 'highlight.js/lib/languages/bash'
import csharp from 'highlight.js/lib/languages/csharp'
import diff from 'highlight.js/lib/languages/diff'
import dockerfile from 'highlight.js/lib/languages/dockerfile'
import ini from 'highlight.js/lib/languages/ini'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import powershell from 'highlight.js/lib/languages/powershell'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'
import { Check, Copy } from 'lucide-react'
import { useI18n } from 'archon-ui'

const languages = { bash, csharp, diff, dockerfile, ini, javascript, json, powershell, sql, typescript, xml, yaml, sh: bash, cs: csharp, ts: typescript, js: javascript, yml: yaml, html: xml }

function textOf(node: ReactNode): string {
  if (typeof node === 'string') {
    return node
  }

  if (Array.isArray(node)) {
    return node.map(textOf).join('')
  }

  if (node && typeof node === 'object' && 'props' in node) {
    return textOf((node as { props: { children?: ReactNode } }).props.children)
  }

  return ''
}

function CodeBlock({ children }: { children?: ReactNode }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(textOf(children).replace(/\n$/, ''))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="doc-code">
      <button type="button" className="doc-code-copy" onClick={copy} aria-label={t('web.doc.copyCode')}>
        {copied ? <Check size={14} /> : <Copy size={14} />}
        <span>{copied ? t('web.common.copied') : t('web.common.copy')}</span>
      </button>
      <pre>{children}</pre>
    </div>
  )
}

export default function MarkdownView({ source }: { source: string }) {
  return (
    <div className="doc-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, [rehypeHighlight, { languages, detect: false }]]}
        components={{
          pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
          table: ({ children }) => (
            <div className="doc-table">
              <table>{children}</table>
            </div>
          ),
          a: ({ href, children }) => (
            <a href={href} target={href?.startsWith('http') ? '_blank' : undefined} rel="noreferrer noopener">
              {children}
            </a>
          )
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  )
}
