"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase-client"
import { ToggleLeft, ToggleRight } from "lucide-react"
import { cn } from "@/lib/utils"

type Flag = { id: string; key: string; enabled: boolean; description: string | null; updated_at: string }

export default function AdminFeaturesPage() {
  const [flags, setFlags] = useState<Flag[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from("feature_flags").select("*").order("key")
    setFlags(data || [])
    setLoading(false)
  }

  async function toggle(flag: Flag) {
    await supabase.from("feature_flags").update({ enabled: !flag.enabled, updated_at: new Date().toISOString() }).eq("id", flag.id)
    setFlags((prev) => prev.map((f) => f.id === flag.id ? { ...f, enabled: !f.enabled } : f))
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Feature Flags</h1>
        <p className="text-sm text-slate-500 mt-1">Platform özelliklerini açıp kapatın</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {loading ? (
          <div className="p-6 text-slate-400">Yükleniyor...</div>
        ) : flags.length === 0 ? (
          <div className="p-6 text-slate-400">Henüz feature flag eklenmemiş. Supabase&apos;den ekleyin.</div>
        ) : flags.map((flag) => (
          <div key={flag.id} className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="font-medium text-slate-900 font-mono text-sm">{flag.key}</p>
              {flag.description && <p className="text-xs text-slate-500 mt-0.5">{flag.description}</p>}
            </div>
            <button onClick={() => toggle(flag)} className="text-2xl focus:outline-none" title={flag.enabled ? "Kapat" : "Aç"}>
              {flag.enabled ? (
                <ToggleRight className="h-8 w-8 text-emerald-500" />
              ) : (
                <ToggleLeft className="h-8 w-8 text-slate-300" />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
