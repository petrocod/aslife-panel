"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { CreditCard, ChevronLeft, ChevronRight, Loader2, Store, X } from "lucide-react"

type Plan = {
  id: string
  name_tr: string
  monthly_price: number
}

type Sub = {
  id: string
  company_id: string
  plan_id: string
  status: string
  trial_ends_at: string | null
  current_period_end: string | null
  created_at: string
  companies: { id: string; name: string } | null
}

const statusColor: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  trialing: "bg-amber-100 text-amber-700",
  canceled: "bg-red-100 text-red-700",
  past_due: "bg-orange-100 text-orange-700",
}

const statusLabel: Record<string, string> = {
  active: "Aktif",
  trialing: "Deneme",
  canceled: "İptal",
  past_due: "Gecikmiş",
}

export default function AdminSubscriptionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <AdminSubscriptionsContent />
    </Suspense>
  )
}

function AdminSubscriptionsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const presetCompanyId = searchParams.get("companyId") || ""
  const [filterCompanyId, setFilterCompanyId] = useState(presetCompanyId)
  const [filterCompanyName, setFilterCompanyName] = useState("")
  const [subs, setSubs] = useState<Sub[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [changingPlan, setChangingPlan] = useState<string | null>(null)
  const limit = 20

  useEffect(() => {
    fetchSubs()
  }, [page, filterStatus, filterCompanyId])

  useEffect(() => {
    if (!presetCompanyId) return
    setFilterCompanyId(presetCompanyId)
  }, [presetCompanyId])

  useEffect(() => {
    if (!filterCompanyId) {
      setFilterCompanyName("")
      return
    }
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch(`/api/admin/companies/${filterCompanyId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const json = await res.json()
        setFilterCompanyName(json.company?.name || "")
      }
    })()
  }, [filterCompanyId])

  async function fetchSubs() {
    setLoading(true)
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    })
    if (filterStatus) params.set("status", filterStatus)
    if (filterCompanyId) params.set("companyId", filterCompanyId)
    const res = await fetch(`/api/admin/subscriptions?${params}`, {
      headers: { Authorization: `Bearer ${session?.access_token || ""}` },
    })
    const json = await res.json()
    setSubs(json.subscriptions || [])
    setPlans(json.plans || [])
    setTotal(json.total || 0)
    setLoading(false)
  }

  async function handleAction(
    subId: string,
    action: string,
    extra?: Record<string, unknown>
  ) {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    await fetch("/api/admin/subscriptions", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token || ""}`,
      },
      body: JSON.stringify({ subscriptionId: subId, action, ...extra }),
    })
    fetchSubs()
  }

  async function handleChangePlan(subId: string, newPlanId: string) {
    setChangingPlan(subId)
    await handleAction(subId, "change_plan", { newPlanId })
    setChangingPlan(null)
  }

  const totalPages = Math.ceil(total / limit)
  const statuses = ["", "trialing", "active", "canceled", "past_due"]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Abonelikler</h1>
        <p className="text-sm text-slate-500 mt-1">
          Tüm abonelikleri yönetin ({total} kayıt)
        </p>
      </div>

      {filterCompanyId && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <div className="flex items-center gap-2 text-slate-700">
            <Store className="h-4 w-4 text-slate-500" />
            <span>
              Müşteri:{" "}
              <strong>{filterCompanyName || filterCompanyId}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                router.push(`/admin/companies/${filterCompanyId}`)
              }
            >
              Müşteri Detayı
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterCompanyId("")
                setFilterCompanyName("")
                router.push("/admin/subscriptions")
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <Button
            key={s}
            variant={filterStatus === s ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setFilterStatus(s)
              setPage(1)
            }}
          >
            {s ? statusLabel[s] || s : "Tümü"}
          </Button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">
                  Şirket
                </th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">
                  Plan
                </th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">
                  Durum
                </th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">
                  Trial Bitiş
                </th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">
                  Periyot Sonu
                </th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-12 text-slate-400"
                  >
                    Yükleniyor...
                  </td>
                </tr>
              ) : subs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-12 text-slate-400"
                  >
                    Kayıt bulunamadı
                  </td>
                </tr>
              ) : (
                subs.map((sub) => {
                  const company = Array.isArray(sub.companies)
                    ? sub.companies[0]
                    : sub.companies
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-slate-400" />
                          {company?.name ? (
                            <button
                              type="button"
                              className="font-medium text-slate-900 hover:text-violet-600 transition-colors text-left"
                              onClick={() =>
                                router.push(
                                  `/admin/companies/${company.id || sub.company_id}`
                                )
                              }
                            >
                              {company.name}
                            </button>
                          ) : (
                            <span className="font-medium text-slate-900">
                              {sub.company_id}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {changingPlan === sub.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                          ) : (
                            <Select
                              value={sub.plan_id}
                              onValueChange={(val) =>
                                handleChangePlan(sub.id, val)
                              }
                            >
                              <SelectTrigger className="h-7 w-[150px] text-xs border-slate-200">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {plans.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name_tr || p.id}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={cn(
                            "text-xs px-2 py-0.5 rounded-full font-medium",
                            statusColor[sub.status] || "bg-slate-100"
                          )}
                        >
                          {statusLabel[sub.status] || sub.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-slate-500">
                        {sub.trial_ends_at
                          ? new Date(sub.trial_ends_at).toLocaleDateString(
                              "tr-TR"
                            )
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-slate-500">
                        {sub.current_period_end
                          ? new Date(
                              sub.current_period_end
                            ).toLocaleDateString("tr-TR")
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {sub.status === "trialing" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() =>
                                handleAction(sub.id, "extend_trial", {
                                  days: 7,
                                })
                              }
                            >
                              +7 Gün
                            </Button>
                          )}
                          {sub.status !== "canceled" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 text-red-600 hover:text-red-700"
                              onClick={() => handleAction(sub.id, "cancel")}
                            >
                              İptal
                            </Button>
                          )}
                          {sub.status === "canceled" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 text-emerald-600 hover:text-emerald-700"
                              onClick={() =>
                                handleAction(sub.id, "reactivate")
                              }
                            >
                              Aktifleştir
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              Sayfa {page} / {totalPages}
            </span>
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
