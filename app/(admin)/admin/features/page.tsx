"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase-client"
import { useAdmin } from "@/hooks/useAdmin"
import { ToggleLeft, ToggleRight, Shield } from "lucide-react"
import { SUPER_ADMIN_ONLY_FLAGS } from "@/lib/platform-flags"

type Flag = { id: string; key: string; enabled: boolean; description: string | null; updated_at: string }

export default function AdminFeaturesPage() {
  const { adminRole, loading: adminLoading } = useAdmin()
  const [flags, setFlags] = useState<Flag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!adminLoading) load()
  }, [adminLoading])

  async function load() {
    setLoading(true)
    setError("")
    const token = (await supabase.auth.getSession()).data.session?.access_token
    if (!token) return
    const res = await fetch("/api/admin/feature-flags", {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json()
    if (!res.ok) setError(json.error || "Yüklenemedi")
    else setFlags(json.flags || [])
    setLoading(false)
  }

  async function toggle(flag: Flag) {
    const token = (await supabase.auth.getSession()).data.session?.access_token
    if (!token) return
    const res = await fetch("/api/admin/feature-flags", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ key: flag.key, enabled: !flag.enabled }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error || "Güncellenemedi")
      return
    }
    setFlags((prev) =>
      prev.map((f) => (f.id === flag.id ? { ...f, enabled: !f.enabled } : f))
    )
  }

  const isSuper = adminRole === "super_admin"

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Özellik bayrakları</h1>
        <p className="text-sm text-slate-500 mt-1">
          Online randevu, sınıflar ve genel deneme kaydı. Varsayılan: kapalı.
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {loading ? (
          <div className="p-6 text-slate-400">Yükleniyor...</div>
        ) : flags.length === 0 ? (
          <div className="p-6 text-slate-400">
            Bayrak yok. Supabase&apos;de <code className="text-xs">platform_enhancements.sql</code> çalıştırın.
          </div>
        ) : (
          flags.map((flag) => {
            const superOnly = SUPER_ADMIN_ONLY_FLAGS.includes(
              flag.key as (typeof SUPER_ADMIN_ONLY_FLAGS)[number]
            )
            const locked = superOnly && !isSuper
            return (
              <div key={flag.id} className="flex items-center justify-between px-6 py-4 gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 font-mono text-sm flex items-center gap-2">
                    {flag.key}
                    {superOnly && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-normal text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                        <Shield className="h-3 w-3" /> super_admin
                      </span>
                    )}
                  </p>
                  {flag.description && (
                    <p className="text-xs text-slate-500 mt-0.5">{flag.description}</p>
                  )}
                  {locked && (
                    <p className="text-xs text-amber-600 mt-1">Yalnızca süper yönetici değiştirebilir.</p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => toggle(flag)}
                  className="text-2xl focus:outline-none disabled:opacity-40"
                  title={flag.enabled ? "Kapat" : "Aç"}
                >
                  {flag.enabled ? (
                    <ToggleRight className="h-8 w-8 text-emerald-500" />
                  ) : (
                    <ToggleLeft className="h-8 w-8 text-slate-300" />
                  )}
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
