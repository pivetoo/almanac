import { httpClient } from 'archon-ui'
import type { DocumentEntity, DocumentPayload, DocumentSearchHit, DocumentStats, DocumentStatusValue, DocumentVersionEntity, SearchParams } from '../types/almanac'

function buildSearchQuery(params: SearchParams): string {
  const query = new URLSearchParams()

  if (params.query?.trim()) {
    query.set('query', params.query.trim())
  }

  if (params.product) {
    query.set('product', params.product)
  }

  if (params.module) {
    query.set('module', params.module)
  }

  if (params.status) {
    query.set('status', String(params.status))
  }

  if (params.sort) {
    query.set('sort', params.sort)
  }

  params.tags?.forEach((tag) => query.append('tags', tag))
  query.set('limit', String(params.limit ?? 50))

  return query.toString()
}

export const documentService = {
  search(params: SearchParams) {
    return httpClient.get<DocumentSearchHit[]>(`/Documents/Search?${buildSearchQuery(params)}`)
  },
  getById(id: number) {
    return httpClient.get<DocumentEntity>(`/Documents/GetById/${id}`)
  },
  versions(id: number) {
    return httpClient.get<DocumentVersionEntity[]>(`/Documents/Versions/${id}/versions`)
  },
  stats() {
    return httpClient.get<DocumentStats>('/Documents/Stats')
  },
  create(payload: DocumentPayload) {
    return httpClient.post<DocumentEntity>('/Documents/Create', payload)
  },
  update(id: number, payload: DocumentPayload) {
    return httpClient.put<DocumentEntity>(`/Documents/Update/${id}`, { ...payload, id })
  },
  setStatus(id: number, status: DocumentStatusValue) {
    return httpClient.put<DocumentEntity>(`/Documents/SetStatus/${id}/status`, { status })
  },
  remove(id: number) {
    return httpClient.delete<DocumentEntity>(`/Documents/Delete/${id}`)
  },
  reindex() {
    return httpClient.post<{ updated: number }>('/Documents/Reindex')
  }
}
