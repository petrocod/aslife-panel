"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { supabaseData as supabase } from "@/lib/supabase-data"
import { useCompany } from "@/hooks/useCompany"
import { useSubscription } from "@/hooks/useSubscription"
import {
  Crown,
  Users,
  CreditCard,
  Shield,
  Loader2,
  ExternalLink,
} from "lucide-react"

type Employee = {
  id: string
  full_name: string
  role: string
}

const ROLE_OPTIONS = [
  { value: "admin", label: "Yönetici (Tam Erişim)" },
  { value: "manager", label: "Müdür (Sınırlı Yönetim)" },
  { value: "staff", label: "Personel (Sadece Randevu)" },
  { value: "readonly", label: "Salt Okunur" },
]

export default function AbonelikAyarlariPage() {
  const router = useRouter()
  const { companyId } = useCompany()
  const { planId, planName, maxUsers, status, trialDaysLeft } = useSubscription()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [roleUpdating, setRoleUpdating] = useState<string | null>(null)

  // Settings state
  const [allowSelfRegister, setAllowSelfRegister] = useState(false)
  const [requireApproval, setRequireApproval] = useState(true)
  const [accountingModule, setAccountingModule] = useState(true)

  useEffect(() => {
    if (!companyId) return
    supabase
      .from("employees")
      .select("id, full_name, role")
      .eq("company_id", companyId)
      .order("full_name")
      .then(({ data }) => {
        setEmployees((data as Employee[]) || [])
        setLoading(false)
      })
    supabase
      .from("settings")
      .select("has_accounting_module")
      .eq("company_id", companyId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setAccountingModule(data.has_accounting_module !== false)
      })
  }, [companyId])

  async function handleRoleChange(empId: string, newRole: string) {
    setRoleUpdating(empId)
    await supabase
      .from("employees")
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq("id", empId)
    setEmployees((prev) =>
      prev.map((e) => (e.id === empId ? { ...e, role: newRole } : e))
    )
    setRoleUpdating(null)
  }

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Abonelik ve Erişim Yönetimi</h1>

      {/* Current Plan Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Crown className="w-4 h-4 text-orange-500" /> Mevcut Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-lg font-bold text-slate-800">{planName || "—"}</p>
              <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> Maks {maxUsers} kullanıcı
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  status === "active" ? "bg-green-100 text-green-700" :
                  status === "trialing" ? "bg-blue-100 text-blue-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  {status === "active" ? "Aktif" :
                   status === "trialing" ? `Deneme (${trialDaysLeft} gün)` :
                   status === "past_due" ? "Ödeme Bekliyor" : status}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => router.push("/hesabim/plan-sec")}>
                <ExternalLink className="w-3.5 h-3.5 mr-1" /> Plan Değiştir
              </Button>
              <Button variant="outline" size="sm" onClick={() => router.push("/hesabim/ek-paketler")}>
                <CreditCard className="w-3.5 h-3.5 mr-1" /> Ek Paketler
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Access Management */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" /> Kullanıcı Erişim Seviyeleri
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : employees.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">Henüz çalışan eklenmemiş.</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_200px] gap-3 px-3 py-2 text-xs font-medium text-slate-500 border-b">
                <span>Çalışan</span>
                <span>Erişim Seviyesi</span>
              </div>
              {employees.map((emp) => (
                <div key={emp.id} className="grid grid-cols-[1fr_200px] gap-3 items-center px-3 py-2 rounded-lg hover:bg-slate-50">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{emp.full_name}</p>
                  </div>
                  <Select
                    value={emp.role || "staff"}
                    onValueChange={(v) => handleRoleChange(emp.id, v)}
                    disabled={roleUpdating === emp.id}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      {roleUpdating === emp.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <SelectValue />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value} className="text-xs">
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-slate-400 mt-4">
            Yönetici: Tüm ayarları değiştirebilir. Müdür: Randevu ve müşteri yönetimi. Personel: Sadece randevu işlemleri. Salt Okunur: Sadece görüntüleme.
          </p>
        </CardContent>
      </Card>

      {/* Module Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Modül Ayarları</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Muhasebe Modülü</Label>
              <p className="text-xs text-slate-500 mt-0.5">Gelir/gider takibi, kasa yönetimi ve finansal raporlar</p>
            </div>
            <Switch
              checked={accountingModule}
              onCheckedChange={async (val) => {
                setAccountingModule(val)
                if (companyId) {
                  await supabase.from("settings").update({ has_accounting_module: val }).eq("company_id", companyId)
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Access Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Kayıt ve Erişim Ayarları</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Çalışan Kendi Kaydını Oluşturabilsin</Label>
              <p className="text-xs text-slate-500 mt-0.5">Çalışanlar davetiye olmadan kayıt olabilir</p>
            </div>
            <Switch checked={allowSelfRegister} onCheckedChange={setAllowSelfRegister} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Yeni Kayıtlar İçin Yönetici Onayı</Label>
              <p className="text-xs text-slate-500 mt-0.5">Yeni kullanıcılar yönetici onayı sonrası aktif olur</p>
            </div>
            <Switch checked={requireApproval} onCheckedChange={setRequireApproval} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
