"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase-client"
import { MessageSquare, Mail, Phone } from "lucide-react"

export default function AdminNotificationsPage() {
  const [stats, setStats] = useState({ totalSms: 0, totalPackages: 0, logs: [] as Record<string, unknown>[] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [smsResult, logResult] = await Promise.all([
        supabase.from("sms_packages").select("total_sms, used_sms"),
        supabase.from("notification_log").select("*").order("created_at", { ascending: false }).limit(50),
      ])

      const smsData = smsResult.data || []
      const totalSms = smsData.reduce((s: number, p: { used_sms: number }) => s + (p.used_sms || 0), 0)
      const totalPackages = smsData.reduce((s: number, p: { total_sms: number }) => s + (p.total_sms || 0), 0)

      setStats({ totalSms, totalPackages, logs: (logResult.data || []) as Record<string, unknown>[] })
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">SMS & Bildirimler</h1>
        <p className="text-sm text-slate-500 mt-1">Platform genelinde bildirim istatistikleri</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Phone className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Gönderilen SMS</p>
              <p className="text-2xl font-bold">{stats.totalSms.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Toplam SMS Paketi</p>
              <p className="text-2xl font-bold">{stats.totalPackages.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Mail className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Bildirim Logu</p>
              <p className="text-2xl font-bold">{stats.logs.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b bg-slate-50">
          <h3 className="font-medium text-slate-700">Son Bildirim Logları</h3>
        </div>
        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-slate-400">Yükleniyor...</div>
          ) : stats.logs.length === 0 ? (
            <div className="p-4 text-slate-400">Henüz log yok</div>
          ) : stats.logs.map((log, i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-3 text-sm">
              <div className="flex gap-1">
                {log.sms_sent && <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">SMS</span>}
                {log.email_sent && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Email</span>}
                {log.whatsapp_sent && <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">WA</span>}
              </div>
              <span className="text-slate-600 font-medium">{String(log.template_key)}</span>
              <span className="ml-auto text-xs text-slate-400">{new Date(String(log.created_at)).toLocaleString("tr-TR")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
