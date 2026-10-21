export const DocumentType = { Overview: 1, Api: 2, BusinessRule: 3, Decision: 4, Runbook: 5 } as const
export type DocumentTypeValue = (typeof DocumentType)[keyof typeof DocumentType]

export const DocumentStatus = { Draft: 1, Reviewed: 2, Outdated: 3 } as const
export type DocumentStatusValue = (typeof DocumentStatus)[keyof typeof DocumentStatus]

export interface Product {
  id: number
  slug: string
  name: string
  description?: string | null
  repository?: string | null
  isActive: boolean
}

export interface ModuleEntity {
  id: number
  productId: number
  slug: string
  name: string
  description?: string | null
  sourcePath?: string | null
  isActive: boolean
  product?: Product | null
}

export interface DocumentEntity {
  id: number
  moduleId: number
  module?: ModuleEntity | null
  type: DocumentTypeValue
  title: string
  summary: string
  body: string
  status: DocumentStatusValue
  version: number
  tags: string[]
  sourceRepository?: string | null
  sourcePath?: string | null
  sourceCommit?: string | null
  createdAt: string
  updatedAt?: string | null
}

export interface DocumentVersionEntity {
  id: number
  documentId: number
  number: number
  title: string
  summary: string
  body: string
  status: DocumentStatusValue
  createdAt: string
}

export interface DocumentSearchHit {
  id: number
  product: string
  module: string
  type: DocumentTypeValue
  title: string
  summary: string
  status: DocumentStatusValue
  tags: string[]
  version: number
  updatedAt: string
}

export interface ModuleSummary {
  product: string
  productName: string
  module: string
  moduleName: string
  description?: string | null
  documentCount: number
}

export interface DocumentStats {
  total: number
  draft: number
  reviewed: number
  outdated: number
  semanticSearch: boolean
}

export interface SearchParams {
  query?: string
  product?: string
  module?: string
  tags?: string[]
  status?: DocumentStatusValue
  sort?: 'recent'
  limit?: number
}

export interface DocumentPayload {
  product: string
  module: string
  type: DocumentTypeValue
  title: string
  summary: string
  body: string
  tags: string[]
  sourceRepository?: string
  sourcePath?: string
  sourceCommit?: string
}
