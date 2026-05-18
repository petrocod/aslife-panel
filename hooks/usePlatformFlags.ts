"use client"

import { useEffect, useState } from "react"
import {
  flagsFromRows,
  type PlatformFlagsMap,
  PLATFORM_FLAG_KEYS,
} from "@/lib/platform-flags"

const DEFAULT = flagsFromRows([])

export function usePlatformFlags() {
  const [flags, setFlags] = useState<PlatformFlagsMap>(DEFAULT)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch("/api/platform/flags")
      .then((r) => (r.ok ? r.json() : { flags: {} }))
      .then((data) => {
        if (!cancelled) {
          setFlags(flagsFromRows(Object.entries(data.flags || {}).map(([key, enabled]) => ({ key, enabled: Boolean(enabled) }))))
        }
      })
      .catch(() => {
        if (!cancelled) setFlags(DEFAULT)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return {
    flags,
    loading,
    onlineRandevu: flags[PLATFORM_FLAG_KEYS.onlineRandevu],
    siniflarModule: flags[PLATFORM_FLAG_KEYS.siniflarModule],
    publicTrial: flags[PLATFORM_FLAG_KEYS.publicSelfServeTrial],
  }
}
