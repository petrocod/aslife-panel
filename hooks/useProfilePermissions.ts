"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase-client"
import { useCompany } from "@/hooks/useCompany"
import {
  canAccessModule,
  moduleForPath,
  type FeaturePermissionsMap,
  type PermissionModuleKey,
} from "@/lib/profile-permissions"

export function useProfilePermissions() {
  const { userId, role } = useCompany()
  const [permissions, setPermissions] = useState<FeaturePermissionsMap | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setPermissions(null)
      setLoading(false)
      return
    }
    let cancelled = false
    supabase
      .from("profiles")
      .select("feature_permissions")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) {
          setPermissions((data?.feature_permissions as FeaturePermissionsMap) ?? null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  function canAccess(module: PermissionModuleKey) {
    return canAccessModule(permissions, module, role)
  }

  function canAccessPath(pathname: string) {
    const mod = moduleForPath(pathname)
    if (!mod) return true
    return canAccess(mod)
  }

  return { permissions, loading, canAccess, canAccessPath, role }
}
