"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { SubscriptionAssignPanel } from "@/components/admin/SubscriptionAssignPanel"
import { cn, formatDate, formatCurrency } from "@/lib/utils"
import type { CatalogPlan } from "@/lib/catalog/types"
import {
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Store,
  X,
  Plus,
  Tags,
  ExternalLink,
} from "lucide-react"

type Sub = {
  id: string
  company_id: string
  plan_id: string
  status: string
  trial_ends_at: string | null
  current_period_end: string | null
  created_at: string
  companies: { id: string; name: string } | null
  plan: CatalogPlan
}

const statusColor: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  trialing: "bg-blue-100 text-blue-700",
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
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>}>
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
  const [plans, setPlans] = useState<CatalogPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignCompanyId, setAssignCompanyId] = useState("")
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([])
  const limit = 20

  useEffect(() => { fetchSubs() }, [page, filterStatus, filterCompanyId])
  useEffect(() => { if (presetCompanyId) setFilterCompanyId(presetCompanyId) }, [presetCompanyId])

  useEffect(() => {
    if (!filterCompanyId) { setFilterCompanyName(""); return }
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession()
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
    const { data: { session } } = await supabase.auth.getSession()
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
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

  async function loadCompaniesForAssign() {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch("/api/admin/companies?limit=100", {
      headers: { Authorization: `Bearer ${session?.access_token || ""}` },
    })
    if (res.ok) {
      const json = await res.json()
      setCompanies((json.companies || []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })))
    }
  }

  async function handleAction(subId: string, action: string, extra?: Record<string, unknown>) {
    const { data: { session } } = await supabase.auth.getSession()
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

  const totalPages = Math.ceil(total / limit)
  const statuses = ["", "trialing", "active", "canceled", "past_due"]

  return (
    <div className="p-6 space-y-4 max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Abonelikler</h1>
          <p className="text-xs text-slate-500 mt-0.5">{total} müşteri aboneliği</p>
        </div>
        <Button size="sm" onClick={() => { void loadCompaniesForAssign(); setAssignCompanyId(filterCompanyId); setAssignOpen(true) }}>
          <Plus className="h-4 w-4 mr-1" /> Abonelik Ata
        </Button>
      </div>

      {filterCompanyId && (
        <div className="flex items-center justify-between rounded-lg border bg-slate-50 px-3 py-2 text-xs">
          <span className="flex items-center gap-1.5"><Store className="h-3.5 w-3.5" /> <strong>{filterCompanyName || filterCompanyId}</strong></span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => router.push(`/admin/companies/${filterCompanyId}`)}>Müşteri</Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setFilterCompanyId(""); router.push("/admin/subscriptions") }}><X className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      )}

      <Tabs defaultValue="list">
        <TabsList className="h-9">
          <TabsTrigger value="list" className="text-xs">Müşteri Abonelikleri</TabsTrigger>
          <TabsTrigger value="plans" className="text-xs">Plan Tanımları (3)</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-3 mt-3">
          <div className="flex flex-wrap gap-1">
            {statuses.map((s) => (
              <Button key={s} variant={filterStatus === s ? "default" : "outline"} size="sm" className="h-7 text-xs"
                onClick={() => { setFilterStatus(s); setPage(1) }}>
                {s ? statusLabel[s] || s : "Tümü"}
              </Button>
            ))}
          </div>

          <div className="rounded-lg border bg-white overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-slate-500">Müşteri</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-500">Plan</th>
                  <th className="text-center px-3 py-2 font-medium text-slate-500">Durum</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-500">Tarihler</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-500">Ücret</th>
                  <th className="text-center px-3 py-2 font-medium text-slate-500">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={6} className="py-10 text-center text-slate-400">Yükleniyor...</td></tr>
                ) : subs.length === 0 ? (
                  <tr><td colSpan={6} className="py-10 text-center text-slate-400">Kayıt yok</td></tr>
                ) : subs.map((sub) => {
                  const company = sub.companies
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2">
                        <button type="button" className="font-medium text-slate-900 hover:text-violet-600 text-left"
                          onClick={() => router.push(`/admin/companies/${company?.id || sub.company_id}`)}>
                          {company?.name || sub.company_id.slice(0, 8)}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <Select value={sub.plan_id} onValueChange={(val) => handleAction(sub.id, "change_plan", { newPlanId: val })}>
                          <SelectTrigger className="h-7 w-[130px] text-xs border-slate-200"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name_tr}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-slate-400 mt-0.5">{sub.plan?.max_users} kullanıcı</p>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", statusColor[sub.status])}>
                          {statusLabel[sub.status] || sub.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-500">
                        <div>Baş: {formatDate(sub.created_at, "dd.MM.yyyy")}</div>
                        {sub.trial_ends_at && <div>Deneme: {formatDate(sub.trial_ends_at, "dd.MM.yyyy")}</div>}
                        {sub.current_period_end && <div>Periyot: {formatDate(sub.current_period_end, "dd.MM.yyyy")}</div>}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700">
                        {formatCurrency(sub.plan?.monthly_price || 0, "TRY")}/ay
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex justify-center gap-1">
                          {sub.status === "trialing" && (
                            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => handleAction(sub.id, "extend_trial", { days: 7 })}>+7g</Button>
                          )}
                          {sub.status !== "canceled" ? (
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] text-red-600" onClick={() => handleAction(sub.id, "cancel")}>İptal</Button>
                          ) : (
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] text-emerald-600" onClick={() => handleAction(sub.id, "reactivate")}>Aktif</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex justify-between px-3 py-2 border-t text-xs text-slate-500">
                <span>Sayfa {page}/{totalPages}</span>
                <div className="flex gap-1">
                  <Button size="icon" variant="outline" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="outline" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="plans" className="mt-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">3 abonelik planı — müşteri panelinde Plan Seç sayfasında görünür.</p>
            <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
              <Link href="/admin/pricing"><Tags className="h-3.5 w-3.5 mr-1" /> Fiyatları Düzenle</Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {plans.map((plan) => (
              <div key={plan.id} className={cn("rounded-lg border p-4 bg-white", plan.highlighted && "border-orange-300 ring-1 ring-orange-200")}>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-sm text-orange-600">{plan.name_tr}</p>
                  {!plan.is_active && <Badge variant="secondary" className="text-[10px]">Pasif</Badge>}
                  {plan.highlighted && <Badge variant="orange" className="text-[10px]">Popüler</Badge>}
                </div>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(plan.monthly_price, "TRY")}<span className="text-xs font-normal text-slate-500">/ay</span></p>
                <p className="text-xs text-slate-500">{formatCurrency(plan.annual_price, "TRY")}/yıl</p>
                <ul className="mt-3 space-y-1 text-xs text-slate-600">
                  <li>· Maks. <strong>{plan.max_users}</strong> kullanıcı</li>
                  <li>· <strong>{plan.sms_included}</strong> SMS dahil</li>
                </ul>
                <p className="text-[11px] text-slate-400 mt-2 line-clamp-2">{plan.description_tr}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 flex items-center gap-1">
            <ExternalLink className="h-3 w-3" />
            Müşteriler yükseltme için: <Link href="/hesabim/plan-sec" className="text-blue-600 hover:underline">/hesabim/plan-sec</Link>
          </p>
        </TabsContent>
      </Tabs>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Müşteriye Abonelik Ata</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500">Müşteri (şirket)</label>
              <select className="mt-1 w-full h-9 rounded border px-2 text-sm" value={assignCompanyId}
                onChange={(e) => setAssignCompanyId(e.target.value)}>
                <option value="">Seçin...</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {assignCompanyId && (
              <SubscriptionAssignPanel
                companyId={assignCompanyId}
                companyName={companies.find((c) => c.id === assignCompanyId)?.name}
                subscription={null}
                onSaved={() => { setAssignOpen(false); fetchSubs() }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
