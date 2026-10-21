import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import { moduleService, productService } from '../services/catalogService'
import type { ModuleEntity, ModuleSummary, Product } from '../types/almanac'
import { useQuery } from './useQuery'

interface CatalogValue {
  products: Product[]
  modules: ModuleEntity[]
  summaries: ModuleSummary[]
  loading: boolean
  reload: () => void
  findProduct: (slug?: string) => Product | undefined
  findSummary: (product?: string, module?: string) => ModuleSummary | undefined
}

const CatalogContext = createContext<CatalogValue | null>(null)

export function CatalogProvider({ children }: { children: ReactNode }) {
  const products = useQuery<Product[]>(() => productService.list(), [])
  const modules = useQuery<ModuleEntity[]>(() => moduleService.list(), [])
  const summaries = useQuery<ModuleSummary[]>(() => moduleService.summaries(), [])

  const value = useMemo<CatalogValue>(() => {
    const productList = products.data ?? []
    const summaryList = summaries.data ?? []

    return {
      products: productList,
      modules: modules.data ?? [],
      summaries: summaryList,
      loading: products.loading || summaries.loading || modules.loading,
      reload: () => {
        products.reload()
        modules.reload()
        summaries.reload()
      },
      findProduct: (slug) => productList.find((item) => item.slug === slug),
      findSummary: (product, module) => summaryList.find((item) => item.product === product && item.module === module)
    }
  }, [products, modules, summaries])

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCatalog(): CatalogValue {
  const context = useContext(CatalogContext)

  if (!context) {
    throw new Error('useCatalog precisa estar dentro de CatalogProvider')
  }

  return context
}
