"use client"

import { useEffect, useState, useCallback } from "react"
import type { CatalogResponse } from "@/lib/catalog/types"
import { DEFAULT_PLANS, DEFAULT_PRODUCTS } from "@/lib/catalog/defaults"

export function useCatalog() {
  const [catalog, setCatalog] = useState<CatalogResponse>({
    plans: DEFAULT_PLANS,
    products: DEFAULT_PRODUCTS,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/catalog")
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Katalog yüklenemedi")
      setCatalog({ plans: json.plans || DEFAULT_PLANS, products: json.products || DEFAULT_PRODUCTS })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { catalog, loading, error, reload }
}
