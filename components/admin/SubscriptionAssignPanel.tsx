"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { CatalogPlan } from "@/lib/catalog/types"

const STATUS_OPTS = [
  { value: "trialing", label: "Deneme" },
  { value: "active", label: "Aktif" },
  { value: "canceled", label: "İptal" },
  { value: "past_due", label: "Gecikmiş" },
] as const

const SUB_BADGE: Record<string, "success" | "info" | "destructive" | "warning" | "secondary"> = {
  active: "success",
  trialing: "info",
  canceled: "destructive",
  past_due: "warning",
}

type SubInfo = {
  id: string
  plan_id: string
  status: string
  trial_ends_at: string | null
  current_period_end: string | null
  created_at: string
  subscription_plans?: { name_tr: string; monthly_price: number | null; max_users: number } | null
}

export function SubscriptionAssignPanel({
  companyId,
  companyName,
  subscription,
  onSaved,
  compact,
}: {
  companyId: string
  companyName?: string
  subscription: SubInfo | null
  onSaved: () => void
  compact?: boolean
}) {
  const [plans, setPlans] = useState<CatalogPlan[]>([])
  const [planId, setPlanId] = useState(subscription?.plan_id || "asistan")
  const [status, setStatus] = useState(subscription?.status || "trialing")
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly")
  const [trialDays, setTrialDays] = useState("14")
  const [loading, setLoading] = useState(false)
  const [loadingPlans, setLoadingPlans] = useState(true)

  useEffect(() => {
    setPlanId(subscription?.plan_id || "asistan")
    setStatus(subscription?.status || "trialing")
  }, [subscription])

  useEffect(() => {
    void (async () => {
      setLoadingPlans(true)
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch("/api/admin/pricing", {
        headers: { Authorization: `Bearer ${session?.access_token || ""}` },
      })
      const json = await res.json()
      if (res.ok) setPlans(json.plans || [])
      setLoadingPlans(false)
    })()
  }, [])

  const selectedPlan = plans.find((p) => p.id === planId)

  async function handleSave() {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch("/api/admin/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({
          companyId,
          planId,
          status,
          billing,
          trialDays: parseInt(trialDays, 10) || 14,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        alert(json.error || "Kaydedilemedi")
        return
      }
      onSaved()
    } finally {
      setLoading(false)
    }
  }

  if (loadingPlans) {
    return <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {subscription && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant={SUB_BADGE[subscription.status] || "secondary"}>
            {STATUS_OPTS.find((s) => s.value === subscription.status)?.label || subscription.status}
          </Badge>
          <span className="text-slate-600">
            {subscription.subscription_plans?.name_tr || subscription.plan_id}
          </span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-500">
            Başlangıç {formatDate(subscription.created_at, "dd.MM.yyyy")}
          </span>
          {subscription.trial_ends_at && (
            <>
              <span className="text-slate-400">·</span>
              <span className="text-slate-500">
                Deneme bitiş {formatDate(subscription.trial_ends_at, "dd.MM.yyyy")}
              </span>
            </>
          )}
          {subscription.current_period_end && (
            <>
              <span className="text-slate-400">·</span>
              <span className="text-slate-500">
                Periyot {formatDate(subscription.current_period_end, "dd.MM.yyyy")}
              </span>
            </>
          )}
        </div>
      )}

      <div className={`grid gap-2 ${compact ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"}`}>
        <div>
          <label className="text-[10px] uppercase text-slate-400">Plan</label>
          <select
            className="mt-0.5 w-full h-8 rounded border border-slate-200 px-2 text-xs bg-white"
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name_tr} — {p.max_users} kullanıcı
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase text-slate-400">Durum</label>
          <select
            className="mt-0.5 w-full h-8 rounded border border-slate-200 px-2 text-xs bg-white"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUS_OPTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase text-slate-400">Faturalama</label>
          <select
            className="mt-0.5 w-full h-8 rounded border border-slate-200 px-2 text-xs bg-white"
            value={billing}
            onChange={(e) => setBilling(e.target.value as "monthly" | "yearly")}
            disabled={status === "trialing"}
          >
            <option value="monthly">Aylık</option>
            <option value="yearly">Yıllık</option>
          </select>
        </div>
        {status === "trialing" ? (
          <div>
            <label className="text-[10px] uppercase text-slate-400">Deneme (gün)</label>
            <input
              type="number"
              className="mt-0.5 w-full h-8 rounded border border-slate-200 px-2 text-xs"
              value={trialDays}
              onChange={(e) => setTrialDays(e.target.value)}
              min={1}
              max={90}
            />
          </div>
        ) : (
          <div className="flex items-end">
            {selectedPlan && (
              <p className="text-xs text-slate-600 pb-1">
                {billing === "yearly"
                  ? formatCurrency(selectedPlan.annual_price, "TRY") + "/yıl"
                  : formatCurrency(selectedPlan.monthly_price, "TRY") + "/ay"}
              </p>
            )}
          </div>
        )}
      </div>

      {selectedPlan && !compact && (
        <p className="text-[11px] text-slate-500">
          {selectedPlan.max_users} kullanıcı · {selectedPlan.sms_included} SMS dahil
          {companyName ? ` · ${companyName}` : ""}
        </p>
      )}

      <Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={loading}>
        {loading && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
        {subscription ? "Aboneliği Güncelle" : "Abonelik Ata"}
      </Button>
    </div>
  )
}
