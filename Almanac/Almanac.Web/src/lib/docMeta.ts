import { BookOpen, Braces, Gavel, ScrollText, Terminal } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { DocumentStatus, DocumentType } from '../types/almanac'
import type { DocumentStatusValue, DocumentTypeValue } from '../types/almanac'

export const documentTypes: DocumentTypeValue[] = [DocumentType.Overview, DocumentType.Api, DocumentType.BusinessRule, DocumentType.Decision, DocumentType.Runbook]

export const documentStatuses: DocumentStatusValue[] = [DocumentStatus.Draft, DocumentStatus.Reviewed, DocumentStatus.Outdated]

export const typeLabelKey: Record<DocumentTypeValue, string> = {
  [DocumentType.Overview]: 'web.type.overview',
  [DocumentType.Api]: 'web.type.api',
  [DocumentType.BusinessRule]: 'web.type.businessRule',
  [DocumentType.Decision]: 'web.type.decision',
  [DocumentType.Runbook]: 'web.type.runbook'
}

export const typeHintKey: Record<DocumentTypeValue, string> = {
  [DocumentType.Overview]: 'web.type.overview.hint',
  [DocumentType.Api]: 'web.type.api.hint',
  [DocumentType.BusinessRule]: 'web.type.businessRule.hint',
  [DocumentType.Decision]: 'web.type.decision.hint',
  [DocumentType.Runbook]: 'web.type.runbook.hint'
}

export const typeIcon: Record<DocumentTypeValue, LucideIcon> = {
  [DocumentType.Overview]: BookOpen,
  [DocumentType.Api]: Braces,
  [DocumentType.BusinessRule]: ScrollText,
  [DocumentType.Decision]: Gavel,
  [DocumentType.Runbook]: Terminal
}

export const statusLabelKey: Record<DocumentStatusValue, string> = {
  [DocumentStatus.Draft]: 'web.status.draft',
  [DocumentStatus.Reviewed]: 'web.status.reviewed',
  [DocumentStatus.Outdated]: 'web.status.outdated'
}

export const statusHintKey: Record<DocumentStatusValue, string> = {
  [DocumentStatus.Draft]: 'web.status.draft.hint',
  [DocumentStatus.Reviewed]: 'web.status.reviewed.hint',
  [DocumentStatus.Outdated]: 'web.status.outdated.hint'
}

export const statusVariant: Record<DocumentStatusValue, 'soft-warning' | 'soft-success' | 'soft-destructive'> = {
  [DocumentStatus.Draft]: 'soft-warning',
  [DocumentStatus.Reviewed]: 'soft-success',
  [DocumentStatus.Outdated]: 'soft-destructive'
}

export function githubSourceUrl(repository?: string | null, path?: string | null, commit?: string | null): string | null {
  if (!repository || !path) {
    return null
  }

  return `https://github.com/${repository}/blob/${commit || 'HEAD'}/${path}`
}
