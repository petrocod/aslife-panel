"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase-client"
import { cn } from "@/lib/utils"
import { BarChart3, TrendingUp, TrendingDown, Users, MessageSquare } from "lucide-react"

type AnalyticsData = {
  growth: { date: string; count: number }[]
  revenue: { month: string; amount: number }[]
  plans: { plan: string; count: number }[]
  churn: { month: string; count: number }[]
  activeUsers: { date: string; count: number }[]
  sms: { used: number; capacity: number }
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch("/api/admin/analytics", {
        headers: { Authorization: `Bearer ${session?.access_token || ""}` },
      })
      if (res.ok) {
        setData(await res.json())
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="p-6 text-slate-400">Yükleniyor...</div>
  if (!data) return <div className="p-6 text-red-500">Veriler yüklenemedi</div>

  const maxGrowth = Math.max(...(data.growth || []).map((d) => d.count), 1)
  const maxRevenue = Math.max(...(data.revenue || []).map((d) => d.amount), 1)
  const totalPlans = (data.plans || []).reduce((s, p) => s + p.count, 0) || 1
  const planColors = ["bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-amber-500", "bg-rose-500"]

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analitik</h1>
        <p className="text-sm text-slate-500 mt-1">Platform performans metrikleri</p>
      </div>

      {/* Growth */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-slate-900">Büyüme (Son 30 Gün)</h2>
        </div>
        <div className="flex items-end gap-1 h-40">
          {(data.growth || []).slice(-30).map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
              <div
                className="w-full bg-blue-500 rounded-t min-h-[2px]"
                style={{ height: `${(d.count / maxGrowth) * 100}%` }}
                title={`${d.date}: ${d.count} kayıt`}
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-2">Her çubuk bir günü temsil eder</p>
      </section>

      {/* Revenue */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-emerald-500" />
          <h2 className="text-lg font-semibold text-slate-900">Aylık Gelir</h2>
        </div>
        <div className="space-y-3">
          {(data.revenue || []).map((m, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-20 shrink-0">{m.month}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full flex items-center pl-2" style={{ width: `${(m.amount / maxRevenue) * 100}%` }}>
                  <span className="text-[10px] text-white font-medium whitespace-nowrap">₺{m.amount.toLocaleString("tr-TR")}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Plan breakdown */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-purple-500" />
            <h2 className="text-lg font-semibold text-slate-900">Plan Dağılımı</h2>
          </div>
          <div className="space-y-3">
            {(data.plans || []).map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-sm text-slate-700 w-28 shrink-0 font-medium">{p.plan}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                  <div className={cn("h-full rounded-full", planColors[i % planColors.length])} style={{ width: `${(p.count / totalPlans) * 100}%` }} />
                </div>
                <span className="text-xs text-slate-500 w-10 text-right">{p.count}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Churn */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="h-5 w-5 text-red-500" />
            <h2 className="text-lg font-semibold text-slate-900">Aylık Churn</h2>
          </div>
          <div className="space-y-3">
            {(data.churn || []).map((m, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{m.month}</span>
                <span className="text-sm font-semibold text-red-600">{m.count} iptal</span>
              </div>
            ))}
            {(!data.churn || data.churn.length === 0) && (
              <p className="text-sm text-slate-400">Henüz iptal verisi yok</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
