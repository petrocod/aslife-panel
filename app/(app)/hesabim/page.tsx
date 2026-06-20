"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase-client"
import { useSubscription } from "@/hooks/useSubscription"
import { useCatalog } from "@/hooks/useCatalog"
import { formatDate, formatCurrency } from "@/lib/utils"
import { Loader2 } from "lucide-react"

const STATUS_LABEL: Record<string, string> = {
  active: "Aktif",
  trialing: "Deneme",
  canceled: "İptal",
  past_due: "Gecikmiş",
}

export default function HesabimPage() {
  const [userId, setUserId] = useState("")
  const [loadingUser, setLoadingUser] = useState(true)
  const {
    planId,
    planName,
    maxUsers,
    status,
    trialEndsAt,
    currentPeriodEnd,
    trialDaysLeft,
    loading: subLoading,
  } = useSubscription()
  const { catalog, loading: catalogLoading } = useCatalog()

  const currentPlan = catalog.plans.find((p) => p.id === planId)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserId(data.user.id.slice(0, 8).toUpperCase())
      }
      setLoadingUser(false)
    })
  }, [])

  const loading = loadingUser || subLoading || catalogLoading

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex justify-end mb-4">
        <Link href="/hesabim/uyelik-iptal">
          <Button variant="outline" size="sm" className="text-xs text-red-500 border-red-200 hover:bg-red-50">
            Üyelik iptali talebi oluştur
          </Button>
        </Link>
      </div>

      <div className="space-y-5">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-700 mb-3 text-sm">Üyelik bilgileri</h3>
          <div className="bg-slate-50 rounded-lg px-4 py-3 flex items-center gap-2">
            <span className="text-slate-400">🪪</span>
            <div>
              <p className="text-xs text-slate-500">Üyelik numarası</p>
              {loadingUser ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400 mt-1" />
              ) : (
                <p className="text-sm font-medium text-slate-800">#{userId || "000000"}</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-700 mb-3 text-sm">Planım</h3>
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-semibold text-slate-900">{planName}</span>
                  <Badge variant={status === "active" ? "success" : status === "trialing" ? "info" : "secondary"}>
                    {STATUS_LABEL[status] || status}
                  </Badge>
                </div>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>· Maks. <strong>{maxUsers}</strong> kullanıcı</li>
                  {currentPlan && (
                    <>
                      <li>· <strong>{currentPlan.sms_included}</strong> SMS dahil</li>
                      <li>· Aylık: {formatCurrency(currentPlan.monthly_price, "TRY")} · Yıllık: {formatCurrency(currentPlan.annual_price, "TRY")}</li>
                    </>
                  )}
                  {status === "trialing" && trialEndsAt && (
                    <li>· Deneme bitiş: <strong>{formatDate(trialEndsAt, "dd.MM.yyyy")}</strong>
                      {trialDaysLeft != null && trialDaysLeft >= 0 && ` (${trialDaysLeft} gün kaldı)`}
                    </li>
                  )}
                  {currentPeriodEnd && (
                    <li>· Periyot sonu: <strong>{formatDate(currentPeriodEnd, "dd.MM.yyyy")}</strong></li>
                  )}
                </ul>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" asChild>
                  <Link href="/hesabim/plan-sec">Plan Yükselt / Tedarik</Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/sepet">Sepete Git</Link>
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-700 mb-3 text-sm">Ödeme Bilgileri</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-lg p-3 flex items-center justify-between">
              <span className="text-sm text-slate-700">Ödeme bilgileri</span>
              <Link href="/hesabim/odeme-bilgileri" className="text-xs text-blue-600 hover:underline">Yönet</Link>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 flex items-center justify-between">
              <span className="text-sm text-slate-700">Geçmiş ödemeler</span>
              <Link href="/hesabim/gecmis-odemeler" className="text-xs text-blue-600 hover:underline">Göster</Link>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-700 mb-2 text-sm">Ek Paketler</h3>
          <p className="text-xs text-slate-500 mb-3">SMS, WhatsApp ve ek kullanıcı paketleri.</p>
          <Link href="/hesabim/ek-paketler">
            <Button variant="outline" size="sm" className="text-xs">Ek paketlere git →</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
