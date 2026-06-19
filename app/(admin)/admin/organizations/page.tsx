"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

/** Organizasyonlar menüsü Müşteriler ile birleştirildi. */
export default function AdminOrganizationsRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/admin/companies")
  }, [router])

  return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  )
}
