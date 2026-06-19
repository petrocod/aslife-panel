"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase-client"
import { Loader2 } from "lucide-react"

export default function AdminOrganizationDetailRedirectPage() {
  const router = useRouter()
  const params = useParams()
  const orgId = params.id as string

  useEffect(() => {
    async function go() {
      const { data } = await supabase
        .from("companies")
        .select("id")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle()

      if (data?.id) {
        router.replace(`/admin/companies/${data.id}`)
      } else {
        router.replace("/admin/companies")
      }
    }
    void go()
  }, [orgId, router])

  return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  )
}
