"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase-client"
import { Activity, Clock, AlertTriangle, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

type AuditLog = { id: string; admin_email: string; action: string; target_type: string; details: Record<string, unknown> | null; created_at: string }
type HealthLog = { id: string; check_type: string; status: string; details: Record<string, unknown> | null; created_at: string }

export default function AdminSystemPage() {
  const [audits, setAudits] = useState<AuditLog[]>([])
  const [health, setHealth] = useState<HealthLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [auditRes, healthRes] = await Promise.all([
        supabase.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("system_health_log").select("*").order("created_at", { ascending: false }).limit(20),
      ])
      setAudits(auditRes.data || [])
      setHealth(healthRes.data || [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Sistem Yönetimi</h1>
        <p className="text-sm text-slate-500 mt-1">Health check ve audit log</p>
      </div>

      {/* Health Check */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-emerald-500" />
          <h2 className="text-lg font-semibold">System Health</h2>
        </div>
        {loading ? <p className="text-slate-400">Yükleniyor...</p> : health.length === 0 ? (
          <p className="text-slate-400 text-sm">Henüz health check kaydı yok</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {health.slice(0, 6).map((h) => (
              <div key={h.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex items-center gap-3">
                {h.status === "ok" ? (
                  <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                )}
                <div>
                  <p className="font-medium text-sm text-slate-900">{h.check_type}</p>
                  <p className="text-xs text-slate-500">{h.status} — {new Date(h.created_at).toLocaleTimeString("tr-TR")}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Audit Log */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b bg-slate-50 flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-400" />
          <h2 className="font-medium text-slate-700">Audit Log (Son 50)</h2>
        </div>
        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
          {loading ? <div className="p-4 text-slate-400">Yükleniyor...</div> :
           audits.length === 0 ? <div className="p-4 text-slate-400 text-sm">Henüz kayıt yok</div> :
           audits.map((a) => (
            <div key={a.id} className="px-4 py-3 text-sm flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-xs font-bold text-slate-600">
                {a.admin_email?.[0]?.toUpperCase() || "A"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-900">
                  <span className="font-medium">{a.admin_email}</span>{" "}
                  <span className="text-slate-500">{a.action}</span>{" "}
                  <span className="text-slate-600">{a.target_type}</span>
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{new Date(a.created_at).toLocaleString("tr-TR")}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
