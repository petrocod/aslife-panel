"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Settings, UserPlus, Shield, Trash2 } from "lucide-react"

type AdminUser = { id: string; email: string; full_name: string; role: string; is_active: boolean; created_at: string }

export default function AdminSettingsPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [newEmail, setNewEmail] = useState("")
  const [newRole, setNewRole] = useState("support_agent")

  useEffect(() => { fetchAdmins() }, [])

  async function fetchAdmins() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch("/api/admin/stats", {
      headers: { Authorization: `Bearer ${session?.access_token || ""}` },
    })
    const { data } = await supabase.from("admin_users").select("*").order("created_at")
    setAdmins(data || [])
    setLoading(false)
  }

  return (
    <div className="p-6 space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Ayarları</h1>
        <p className="text-sm text-slate-500 mt-1">Admin kullanıcılarını ve sistem ayarlarını yönetin</p>
      </div>

      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-violet-500" />
          <h2 className="text-lg font-semibold">Admin Kullanıcıları</h2>
        </div>

        <div className="space-y-3 mb-6">
          {loading ? <p className="text-slate-400">Yükleniyor...</p> : admins.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50">
              <div>
                <p className="font-medium text-slate-900">{a.full_name || a.email}</p>
                <p className="text-xs text-slate-500">{a.email} — <span className="font-medium">{a.role}</span></p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${a.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                {a.is_active ? "Aktif" : "Pasif"}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 pt-4">
          <p className="text-sm font-medium text-slate-700 mb-2">Yeni admin eklemek için Supabase SQL Editor kullanın:</p>
          <pre className="bg-slate-900 text-slate-100 text-xs p-4 rounded-lg overflow-x-auto">
{`INSERT INTO admin_users (user_id, email, full_name, role)
VALUES (
  'auth-user-uuid-here',
  'admin@example.com',
  'Admin Adı',
  'super_admin' -- veya 'support_agent' veya 'sales'
);`}
          </pre>
        </div>
      </section>
    </div>
  )
}
