"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase-client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn, formatDate } from "@/lib/utils"
import {
  Search,
  Store,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  MoreHorizontal,
  ExternalLink,
  LogIn,
  CreditCard,
  Users,
} from "lucide-react"

interface Company {
  id: string
  name: string
  phone: string
  email: string
  currency: string
  service_type: string
  is_active: boolean
  created_at: string
  organization_id: string
  organization: { id: string; name: string; slug: string } | null
  owner: { id: string; full_name: string } | null
  customers_count: number
  subscription: {
    plan_id: string
    status: string
    trial_ends_at: string | null
  } | null
}

interface OrgOption {
  id: string
  name: string
}

interface ApiResponse {
  companies: Company[]
  total: number
  page: number
  limit: number
  totalPages: number
}

function PlanBadge({ sub }: { sub: Company["subscription"] }) {
  if (!sub)
    return (
      <Badge variant="outline" className="border-slate-200 text-slate-400">
        Yok
      </Badge>
    )

  const statusMap: Record<
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

  const planLabels: Record<string, string> = {
    asistan: "aSistan",
    asistan_plus: "aSistan Plus",
    asistan_pro: "aSistan Pro",
  }

  const s = statusMap[sub.status] || {
    label: sub.status,
    variant: "secondary" as const,
  }
  return (
    <div className="flex items-center gap-1.5">
      <Badge variant={s.variant}>{s.label}</Badge>
      <span className="text-xs text-slate-500">
        {planLabels[sub.plan_id] || sub.plan_id}
      </span>
    </div>
  )
}

export default function AdminCompaniesPage() {
  const router = useRouter()
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [page, setPage] = useState(1)
  const [orgFilter, setOrgFilter] = useState<string>("all")
  const [orgs, setOrgs] = useState<OrgOption[]>([])
  const limit = 20

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    async function loadOrgs() {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch("/api/admin/organizations?limit=100", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const json = await res.json()
        setOrgs(
          json.organizations.map((o: { id: string; name: string }) => ({
            id: o.id,
            name: o.name,
          }))
        )
      }
    }
    loadOrgs()
  }, [])

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
      if (orgFilter && orgFilter !== "all") params.set("org_id", orgFilter)

      const res = await fetch(`/api/admin/companies?${params}`, {
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
  }, [page, debouncedSearch, orgFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function handleLoginAs(companyId: string) {
    alert(`Login as company: ${companyId} — Bu özellik henüz aktif değil.`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Şirketler</h1>
          <p className="text-sm text-slate-500 mt-1">
            Tüm şirketleri, aboneliklerini ve sahiplerini görüntüleyin
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

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Şirket adı, telefon veya email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 border-slate-200"
          />
        </div>
        <Select
          value={orgFilter}
          onValueChange={(v) => {
            setOrgFilter(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[220px] border-slate-200">
            <SelectValue placeholder="Organizasyon filtrele" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Organizasyonlar</SelectItem>
            {orgs.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {data && (
          <span className="text-sm text-slate-500">
            Toplam {data.total} şirket
          </span>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Şirket Adı
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Organizasyon
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Sahip
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Müşteri Sayısı
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Abonelik Planı
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Durum
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Kayıt Tarihi
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  İşlem
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
              ) : !data?.companies?.length ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <Store className="h-8 w-8 text-slate-300 mx-auto" />
                    <p className="text-sm text-slate-500 mt-2">
                      Şirket bulunamadı
                    </p>
                  </td>
                </tr>
              ) : (
                data.companies.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                          <Store className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <button
                            onClick={() =>
                              router.push(`/admin/companies/${c.id}`)
                            }
                            className="font-medium text-slate-900 hover:text-violet-600 transition-colors text-left"
                          >
                            {c.name}
                          </button>
                          {c.service_type && (
                            <p className="text-xs text-slate-500">
                              {c.service_type}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {c.organization ? (
                        <button
                          onClick={() =>
                            router.push(
                              `/admin/organizations/${c.organization!.id}`
                            )
                          }
                          className="text-slate-700 hover:text-violet-600 transition-colors"
                        >
                          {c.organization.name}
                        </button>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {c.owner?.full_name || "—"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1 text-slate-700">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        {c.customers_count}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <PlanBadge sub={c.subscription} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      {c.is_active ? (
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
                      {formatDate(c.created_at)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/admin/companies/${c.id}`)
                            }
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Detay
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleLoginAs(c.id)}
                          >
                            <LogIn className="h-4 w-4 mr-2" />
                            Olarak Giriş Yap
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                `/admin/companies/${c.id}#subscription`
                              )
                            }
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Plan Değiştir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
