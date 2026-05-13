"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase-client"

type AdminData = {
  isAdmin: boolean
  adminId: string | null
  adminRole: "super_admin" | "support_agent" | "sales" | null
  userId: string | null
  email: string
  fullName: string
}

export function useAdmin() {
  const [data, setData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          if (!cancelled) setData({ isAdmin: false, adminId: null, adminRole: null, userId: null, email: "", fullName: "" })
          return
        }

        const { data: admin } = await supabase
          .from("admin_users")
          .select("id, role, email, full_name")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .maybeSingle()

        if (!cancelled) {
          setData({
            isAdmin: !!admin,
            adminId: admin?.id || null,
            adminRole: admin?.role as AdminData["adminRole"] || null,
            userId: user.id,
            email: admin?.email || user.email || "",
            fullName: admin?.full_name || "",
          })
        }
      } catch {
        if (!cancelled) setData({ isAdmin: false, adminId: null, adminRole: null, userId: null, email: "", fullName: "" })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [])

  return {
    loading,
    isAdmin: data?.isAdmin ?? false,
    adminId: data?.adminId ?? null,
    adminRole: data?.adminRole ?? null,
    userId: data?.userId ?? null,
    email: data?.email ?? "",
    fullName: data?.fullName ?? "",
  }
}
