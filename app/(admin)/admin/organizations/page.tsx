"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase-client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn, formatDate } from "@/lib/utils"
import {
  Search,
  Building2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Users,
  Store,
} from "lucide-react"

interface Organization {
  id: string
  name: string
  slug: string
  owner_email: string
  max_branches: number
  is_active: boolean
  created_at: string
  companies_count: number
  members_count: number
  subscription: {
    plan_id: string
    status: string
    trial_ends_at: string | null
  } | null
}

interface ApiResponse {
  organizations: Organization[]
  total: number
  page: number
  limit: number
  totalPages: number
}

function SubscriptionBadge({ sub }: { sub: Organization["subscription"] }) {
  if (!sub)
    return (
      <Badge variant="outline" className="border-slate-200 text-slate-400">
        Yok
      </Badge>
    )
  const map: Record<
    string,
    {
      label: string
      variant: "success" | "warning" | "info" | "destructive" | "secondary"
    }
  > = {
    active: { label: "Aktif", variant: "success" },
    trialing: { label: "Deneme", variant: "info" },
    past_due: { label: "Gecikmiş", variant: "warning" },
    canceled: { label: "İptal", variant: "destructive" },
    unpaid: { label: "Ödenmedi", variant: "destructive" },
  }
  const s = map[sub.status] || {
    label: sub.status,
    variant: "secondary" as const,
  }
  return (
    <div className="flex items-center gap-1.5">
      <Badge variant={s.variant}>{s.label}</Badge>
      <span className="text-xs text-slate-500">{sub.plan_id}</span>
    </div>
  )
}

export default function AdminOrganizationsPage() {
  const router = useRouter()
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [page, setPage] = useState(1)
  const limit = 20

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [search])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      })
      if (debouncedSearch) params.set("search", debouncedSearch)

      const res = await fetch(`/api/admin/organizations?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        setData(await res.json())
      }
    } catch {
      /* silently fail */
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Organizasyonlar
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Tüm organizasyonları ve aboneliklerini yönetin
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchData}
          className="text-slate-500 hover:text-slate-900 hover:bg-slate-100"
        >
          <RefreshCw
            className={cn("h-4 w-4 mr-2", loading && "animate-spin")}
          />
          Yenile
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Ad, slug veya email ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 border-slate-200"
          />
        </div>
        {data && (
          <span className="text-sm text-slate-500">
            Toplam {data.total} organizasyon
          </span>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Ad
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Slug
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Sahip
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Şube Sayısı
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Üye Sayısı
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Abonelik
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Durum
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Oluşturulma
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && !data ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400 mx-auto" />
                    <p className="text-sm text-slate-500 mt-2">
                      Yükleniyor...
                    </p>
                  </td>
                </tr>
              ) : !data?.organizations?.length ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <Building2 className="h-8 w-8 text-slate-300 mx-auto" />
                    <p className="text-sm text-slate-500 mt-2">
                      Organizasyon bulunamadı
                    </p>
                  </td>
                </tr>
              ) : (
                data.organizations.map((org) => (
                  <tr
                    key={org.id}
                    onClick={() =>
                      router.push(`/admin/organizations/${org.id}`)
                    }
                    className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                          <Building2 className="h-4 w-4 text-violet-600" />
                        </div>
                        <span className="font-medium text-slate-900">
                          {org.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-xs">
                      {org.slug}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {org.owner_email || "—"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1 text-slate-700">
                        <Store className="h-3.5 w-3.5 text-slate-400" />
                        {org.companies_count}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1 text-slate-700">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        {org.members_count}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <SubscriptionBadge sub={org.subscription} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      {org.is_active ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span className="text-xs text-emerald-700">
                            Aktif
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-red-500" />
                          <span className="text-xs text-red-700">Pasif</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs">
                      {formatDate(org.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              Sayfa {data.page} / {data.totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Önceki
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              >
                Sonraki
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
