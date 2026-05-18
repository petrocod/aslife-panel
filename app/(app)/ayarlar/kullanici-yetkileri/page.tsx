"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase-client"
import { useCompany } from "@/hooks/useCompany"
import {
  PERMISSION_MODULES,
  type FeaturePermissionsMap,
  defaultPermissionsForRole,
} from "@/lib/profile-permissions"

type ProfileRow = {
  id: string
  full_name: string
  email: string
  role: string
  feature_permissions: FeaturePermissionsMap | null
}

export default function KullaniciYetkileriPage() {
  const { companyId, role, userId } = useCompany()
  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, FeaturePermissionsMap>>({})

  const canManage = role === "owner" || role === "manager"

  useEffect(() => {
    if (!companyId) return
    supabase
      .from("profiles")
      .select("id, full_name, email, role, feature_permissions")
      .eq("company_id", companyId)
      .order("full_name")
      .then(({ data }) => {
        const rows = (data as ProfileRow[]) ?? []
        setProfiles(rows)
        const d: Record<string, FeaturePermissionsMap> = {}
        for (const p of rows) {
          d[p.id] =
            p.feature_permissions && Object.keys(p.feature_permissions).length > 0
              ? { ...p.feature_permissions }
              : defaultPermissionsForRole(p.role)
        }
        setDrafts(d)
        setLoading(false)
      })
  }, [companyId])

  async function save(profileId: string) {
    const token = (await supabase.auth.getSession()).data.session?.access_token
    if (!token) return
    setSavingId(profileId)
    const res = await fetch("/api/company/profile-permissions", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ profileId, permissions: drafts[profileId] }),
    })
    setSavingId(null)
    if (res.ok) {
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === profileId ? { ...p, feature_permissions: drafts[profileId] } : p
        )
      )
    }
  }

  function toggle(profileId: string, key: string, checked: boolean) {
    setDrafts((prev) => ({
      ...prev,
      [profileId]: { ...prev[profileId], [key]: checked },
    }))
  }

  if (!canManage) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-600">Bu sayfaya yalnızca işletme sahibi veya yönetici erişebilir.</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl">
      <Link href="/ayarlar" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Ayarlar
      </Link>
      <h1 className="text-xl font-bold text-slate-900">Kullanıcı yetkileri</h1>
      <p className="text-sm text-slate-500 mt-1 mb-6">
        Çalışanların menü ve modül erişimini işaretleyerek yönetin.
      </p>

      {loading ? (
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      ) : (
        <div className="space-y-6">
          {profiles
            .filter((p) => p.id !== userId || p.role === "employee")
            .map((p) => (
              <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div>
                    <p className="font-medium text-slate-900">{p.full_name || p.email}</p>
                    <p className="text-xs text-slate-500">{p.role}</p>
                  </div>
                  {p.role !== "owner" && (
                    <Button
                      size="sm"
                      disabled={savingId === p.id}
                      onClick={() => save(p.id)}
                      className="gap-1.5"
                    >
                      {savingId === p.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      Kaydet
                    </Button>
                  )}
                </div>
                {p.role === "owner" ? (
                  <p className="text-xs text-slate-500">Sahip: tam erişim</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PERMISSION_MODULES.map((m) => (
                      <label
                        key={m.key}
                        className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={drafts[p.id]?.[m.key] !== false}
                          onChange={(e) => toggle(p.id, m.key, e.target.checked)}
                        />
                        {m.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
