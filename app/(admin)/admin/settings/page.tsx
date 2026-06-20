"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Shield,
  UserPlus,
  KeyRound,
  Loader2,
  Copy,
  CheckCircle,
  Eye,
  EyeOff,
  Ban,
  ShieldCheck,
} from "lucide-react"
import { supabase } from "@/lib/supabase-client"
import { useAdmin } from "@/hooks/useAdmin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type AdminUser = {
  id: string
  user_id: string | null
  email: string
  full_name: string
  role: string
  is_active: boolean
  created_at: string
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  support_agent: "Destek",
  sales: "Satış",
}

export default function AdminSettingsPage() {
  const { adminRole, adminId, loading: adminLoading } = useAdmin()
  const isSuperAdmin = adminRole === "super_admin"

  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)

  const [newEmail, setNewEmail] = useState("")
  const [newFullName, setNewFullName] = useState("")
  const [newRole, setNewRole] = useState("support_agent")
  const [newPassword, setNewPassword] = useState("")
  const [creating, setCreating] = useState(false)
  const [createResult, setCreateResult] = useState<{ tempPassword: string | null; message: string } | null>(null)

  const [newOwnPassword, setNewOwnPassword] = useState("")
  const [confirmOwnPassword, setConfirmOwnPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  const [resetDialog, setResetDialog] = useState<{
    open: boolean
    admin: AdminUser | null
    result: string | null
    loading: boolean
  }>({ open: false, admin: null, result: null, loading: false })

  const getToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    return session?.access_token || null
  }

  const fetchAdmins = useCallback(async () => {
    setLoading(true)
    try {
      const token = await getToken()
      if (!token) return
      const res = await fetch("/api/admin/admins", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (res.ok) setAdmins(json.admins || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!adminLoading) void fetchAdmins()
  }, [adminLoading, fetchAdmins])

  async function handleOwnPasswordChange() {
    if (!newOwnPassword || !confirmOwnPassword) {
      setPasswordError("Tüm şifre alanları zorunludur.")
      return
    }
    if (newOwnPassword.length < 6) {
      setPasswordError("Şifre en az 6 karakter olmalıdır.")
      return
    }
    if (newOwnPassword !== confirmOwnPassword) {
      setPasswordError("Şifreler eşleşmiyor.")
      return
    }

    setPasswordSaving(true)
    setPasswordError("")
    setPasswordSuccess(false)

    const { error } = await supabase.auth.updateUser({ password: newOwnPassword })
    setPasswordSaving(false)

    if (error) {
      setPasswordError(error.message)
      return
    }

    setNewOwnPassword("")
    setConfirmOwnPassword("")
    setPasswordSuccess(true)
    setTimeout(() => setPasswordSuccess(false), 4000)
  }

  async function handleCreateAdmin() {
    if (!newEmail) return
    setCreating(true)
    try {
      const token = await getToken()
      if (!token) return
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail,
          fullName: newFullName,
          role: newRole,
          password: newPassword || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        alert(json.error || "Hata oluştu")
        return
      }
      setCreateResult({ tempPassword: json.tempPassword, message: json.message })
      setNewEmail("")
      setNewFullName("")
      setNewPassword("")
      setNewRole("support_agent")
      void fetchAdmins()
    } finally {
      setCreating(false)
    }
  }

  async function handleAdminAction(adminRow: AdminUser, action: string) {
    const token = await getToken()
    if (!token) return
    const res = await fetch(`/api/admin/admins/${adminRow.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    })
    const json = await res.json()
    if (!res.ok) {
      alert(json.error || "Hata oluştu")
      return
    }
    void fetchAdmins()
    return json
  }

  async function handleResetAdminPassword() {
    if (!resetDialog.admin) return
    setResetDialog((p) => ({ ...p, loading: true, result: null }))
    const json = await handleAdminAction(resetDialog.admin, "set_password")
    if (json?.tempPassword) {
      setResetDialog((p) => ({
        ...p,
        loading: false,
        result: json.tempPassword as string,
      }))
    } else {
      setResetDialog({ open: false, admin: null, result: null, loading: false })
    }
  }

  return (
    <div className="p-6 space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Ayarları</h1>
        <p className="text-sm text-slate-500 mt-1">Şifre, admin kullanıcıları ve sistem ayarları</p>
      </div>

      {/* Own password */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="h-5 w-5 text-orange-500" />
          <h2 className="text-lg font-semibold">Şifremi Değiştir</h2>
        </div>
        <div className="grid gap-4 max-w-md">
          <div className="space-y-2">
            <Label>Yeni Şifre</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={newOwnPassword}
                onChange={(e) => setNewOwnPassword(e.target.value)}
                placeholder="En az 6 karakter"
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Yeni Şifre (Tekrar)</Label>
            <Input
              type={showPassword ? "text" : "password"}
              value={confirmOwnPassword}
              onChange={(e) => setConfirmOwnPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleOwnPasswordChange()}
            />
          </div>
          {passwordError && (
            <p className="text-sm text-red-600">{passwordError}</p>
          )}
          {passwordSuccess && (
            <p className="text-sm text-emerald-600 flex items-center gap-1">
              <CheckCircle className="h-4 w-4" /> Şifre güncellendi.
            </p>
          )}
          <Button onClick={handleOwnPasswordChange} disabled={passwordSaving} className="w-fit">
            {passwordSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Şifreyi Güncelle
          </Button>
        </div>
      </section>

      {/* Admin users */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-violet-500" />
          <h2 className="text-lg font-semibold">Admin Kullanıcıları</h2>
        </div>

        <div className="space-y-3 mb-6">
          {loading ? (
            <p className="text-slate-400 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor...
            </p>
          ) : (
            admins.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">{a.full_name || a.email}</p>
                  <p className="text-xs text-slate-500">
                    {a.email} — {ROLE_LABELS[a.role] || a.role}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      a.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {a.is_active ? "Aktif" : "Pasif"}
                  </span>
                  {isSuperAdmin && a.id !== adminId && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setResetDialog({ open: true, admin: a, result: null, loading: false })
                        }
                      >
                        Şifre Sıfırla
                      </Button>
                      {a.is_active ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-orange-600"
                          onClick={() => void handleAdminAction(a, "deactivate")}
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-emerald-600"
                          onClick={() => void handleAdminAction(a, "activate")}
                        >
                          <ShieldCheck className="h-4 w-4" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {isSuperAdmin && (
          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="h-5 w-5 text-blue-500" />
              <h3 className="font-semibold text-slate-800">Yeni Admin Ekle</h3>
            </div>

            {createResult ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                <p className="text-sm text-emerald-800 font-medium">{createResult.message}</p>
                {createResult.tempPassword && (
                  <div className="flex items-center justify-between bg-white rounded px-3 py-2 text-sm">
                    <span className="text-slate-600">Geçici şifre:</span>
                    <div className="flex items-center gap-2 font-mono">
                      {createResult.tempPassword}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => navigator.clipboard.writeText(createResult.tempPassword!)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
                <Button size="sm" onClick={() => setCreateResult(null)}>
                  Tamam
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 max-w-md">
                <div className="space-y-2">
                  <Label>E-posta *</Label>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="admin@ornek.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ad Soyad</Label>
                  <Input
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="Ad Soyad"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rol</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                  >
                    <option value="support_agent">Destek (support_agent)</option>
                    <option value="sales">Satış (sales)</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Şifre (isteğe bağlı)</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Boş bırakılırsa otomatik oluşturulur"
                  />
                </div>
                <Button
                  onClick={handleCreateAdmin}
                  disabled={creating || !newEmail}
                  className="w-fit"
                >
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Admin Ekle
                </Button>
              </div>
            )}
          </div>
        )}

        {!isSuperAdmin && (
          <p className="text-sm text-slate-500 border-t border-slate-200 pt-4">
            Admin ekleme ve şifre sıfırlama yalnızca super_admin tarafından yapılabilir.
          </p>
        )}
      </section>

      <Dialog
        open={resetDialog.open}
        onOpenChange={(open) =>
          !open && setResetDialog({ open: false, admin: null, result: null, loading: false })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admin Şifresi Sıfırla</DialogTitle>
            <DialogDescription>
              {resetDialog.admin?.email} için yeni geçici şifre oluşturulacak.
            </DialogDescription>
          </DialogHeader>
          {resetDialog.result ? (
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="text-sm text-slate-600 mb-2">Yeni geçici şifre:</p>
              <div className="flex items-center justify-between font-mono text-sm">
                {resetDialog.result}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => navigator.clipboard.writeText(resetDialog.result!)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResetDialog({ open: false, admin: null, result: null, loading: false })}
            >
              {resetDialog.result ? "Kapat" : "İptal"}
            </Button>
            {!resetDialog.result && (
              <Button onClick={handleResetAdminPassword} disabled={resetDialog.loading}>
                {resetDialog.loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sıfırla
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
