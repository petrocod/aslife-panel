"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase-client"
import { DEMO_COMPANY_ID } from "@/lib/demo-limits"

export type CompanyBranding = {
  name: string
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  logo_url: string | null
  tax_number: string | null
  tax_office: string | null
}

export function useCompanyBranding(companyId: string | null) {
  const [branding, setBranding] = useState<CompanyBranding | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const cid = companyId || DEMO_COMPANY_ID

    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from("companies")
        .select("name, phone, email, address, city, logo_url, tax_number, tax_office")
        .eq("id", cid)
        .maybeSingle()

      if (!cancelled) {
        setBranding(
          data
            ? {
                name: data.name || "Şirket",
                phone: data.phone ?? null,
                email: data.email ?? null,
                address: data.address ?? null,
                city: data.city ?? null,
                logo_url: data.logo_url ?? null,
                tax_number: data.tax_number ?? null,
                tax_office: data.tax_office ?? null,
              }
            : null
        )
        setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [companyId])

  return { branding, loading }
}
