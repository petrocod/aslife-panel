"use client"

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { DEMO_COMPANY_ID } from '@/lib/demo-limits'

export { DEMO_COMPANY_ID } from '@/lib/demo-limits'

type CompanyData = {
  userId: string | null
  /** Oturum yok: demo UUID. Oturum var: profiles.company_id veya atanmamışsa null */
  companyId: string | null
  /** profiles.organization_id — multi-branch SaaS */
  organizationId: string | null
  fullName: string
  email: string
  /** profiles.role — oturum yoksa null */
  role: string | null
}

export function useCompany() {
  const [data, setData] = useState<CompanyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState(0)

  const refetch = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          if (!cancelled) {
            setData({
              userId: null,
              companyId: DEMO_COMPANY_ID,
              organizationId: null,
              fullName: 'Demo Kullanıcı',
              email: '',
              role: null,
            })
          }
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id, organization_id, full_name, email, role')
          .eq('id', user.id)
          .maybeSingle()

        if (!cancelled) {
          setData({
            userId: user.id,
            companyId: profile?.company_id ?? null,
            organizationId: profile?.organization_id ?? null,
            fullName: profile?.full_name || '',
            email: profile?.email || user.email || '',
            role: profile?.role ?? null,
          })
        }
      } catch {
        if (!cancelled) {
          setData({
            userId: null,
            companyId: DEMO_COMPANY_ID,
            organizationId: null,
            fullName: 'Demo Kullanıcı',
            email: '',
            role: null,
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [version])

  return {
    loading,
    userId: data?.userId ?? null,
    companyId: data?.companyId ?? null,
    organizationId: data?.organizationId ?? null,
    fullName: data?.fullName ?? '',
    email: data?.email ?? '',
    role: data?.role ?? null,
    refetch,
  }
}
