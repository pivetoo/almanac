import { httpClient } from 'archon-ui'
import type { ModuleEntity, ModuleSummary, Product } from '../types/almanac'

export interface ProductPayload {
  slug: string
  name: string
  description?: string
  repository?: string
}

export interface ProductUpdatePayload extends ProductPayload {
  isActive: boolean
}

export interface ModulePayload {
  productId: number
  slug: string
  name: string
  description?: string
  sourcePath?: string
}

export interface ModuleUpdatePayload extends ModulePayload {
  isActive: boolean
}

export const productService = {
  list() {
    return httpClient.get<Product[]>('/Products/Get?page=1&pageSize=200')
  },
  create(payload: ProductPayload) {
    return httpClient.post<Product>('/Products/Create', payload)
  },
  update(id: number, payload: ProductUpdatePayload) {
    return httpClient.put<Product>(`/Products/Update/${id}`, { ...payload, id })
  },
  remove(id: number) {
    return httpClient.delete<Product>(`/Products/Delete/${id}`)
  }
}

export const moduleService = {
  list() {
    return httpClient.get<ModuleEntity[]>('/Modules/Get?page=1&pageSize=200')
  },
  summaries(product?: string) {
    const query = product ? `?product=${encodeURIComponent(product)}` : ''
    return httpClient.get<ModuleSummary[]>(`/Modules/Summaries${query}`)
  },
  create(payload: ModulePayload) {
    return httpClient.post<ModuleEntity>('/Modules/Create', payload)
  },
  update(id: number, payload: ModuleUpdatePayload) {
    return httpClient.put<ModuleEntity>(`/Modules/Update/${id}`, { ...payload, id })
  },
  remove(id: number) {
    return httpClient.delete<ModuleEntity>(`/Modules/Delete/${id}`)
  }
}
