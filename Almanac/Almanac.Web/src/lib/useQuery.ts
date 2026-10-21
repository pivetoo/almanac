import { useCallback, useEffect, useRef, useState } from 'react'
import type { DependencyList } from 'react'
import { toast } from 'archon-ui'
import type { ApiError, ApiResponse, PaginationMetadata } from 'archon-ui'

interface QueryResult<T> {
  key: string | null
  data: T | null
  error: ApiError | null
  pagination: PaginationMetadata | null
}

interface QueryOptions {
  enabled?: boolean
  silent?: boolean
}

// Leitura de tela com descarte de resposta atrasada: o useApi grava o estado na ordem em que as
// chamadas terminam, e numa busca que dispara a cada tecla a resposta velha podia vencer a nova.
// "loading" é derivado da chave da consulta, então nenhum setState acontece de forma síncrona no efeito.
export function useQuery<T>(fetcher: () => Promise<ApiResponse<T>>, deps: DependencyList, options: QueryOptions = {}) {
  const { enabled = true, silent = false } = options
  const [version, setVersion] = useState(0)
  const [result, setResult] = useState<QueryResult<T>>({ key: null, data: null, error: null, pagination: null })
  const fetcherRef = useRef(fetcher)
  const key = `${version}|${deps.map(String).join('|')}`

  useEffect(() => {
    fetcherRef.current = fetcher
  })

  useEffect(() => {
    if (!enabled) {
      return
    }

    let cancelled = false

    fetcherRef.current()
      .then((response) => {
        if (!cancelled) {
          setResult({ key, data: response.data ?? null, error: null, pagination: response.pagination ?? null })
        }
      })
      .catch((error: ApiError) => {
        if (cancelled) {
          return
        }

        setResult({ key, data: null, error, pagination: null })

        if (!silent) {
          toast({ title: error.message, variant: 'destructive' })
        }
      })

    return () => {
      cancelled = true
    }
  }, [key, enabled, silent])

  const reload = useCallback(() => setVersion((current) => current + 1), [])

  return { data: result.data, error: result.error, pagination: result.pagination, loading: enabled && result.key !== key, reload }
}
