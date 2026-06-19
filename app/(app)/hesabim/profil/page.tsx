"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase-client"
import { useCompany } from "@/hooks/useCompany"
import { CompanyRegisterForm } from "@/components/settings/CompanyRegisterForm"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Save, Lock, Eye, EyeOff } from "lucide-react"

export default function ProfilPage() {
  const { companyId, userId, refetch: refetchCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data?.user) {
        const meta = data.user.user_metadata
        setFullName(meta?.full_name || "")
        setEmail(data.user.email || "")

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("id", data.user.id)
          .maybeSingle()

        if (profile) {
          setFullName(profile.full_name || meta?.full_name || "")
          setPhone(profile.phone || "")
        }
      }
      setLoading(false)
    })
  }, [])

  async function handlePasswordChange() {
    if (!newPassword || !confirmPassword) {
      setPasswordError("Tüm şifre alanları zorunludur.")
      return
    }
    if (newPassword.length < 6) {
      setPasswordError("Şifre en az 6 karakter olmalıdır.")
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Şifreler eşleşmiyor.")
      return
    }

    setPasswordSaving(true)
    setPasswordError("")
    setPasswordSuccess(false)

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordSaving(false)

    if (error) {
      setPasswordError(error.message)
      return
    }

    setNewPassword("")
    setConfirmPassword("")
    setPasswordSuccess(true)
    setTimeout(() => setPasswordSuccess(false), 3000)
  }

  async function handleSave() {
    setSaving(true)
    setError("")
    setSuccess(false)

    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      setSaving(false)
      return
    }

    const { error: err } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone })
      .eq("id", userData.user.id)

    setSaving(false)
    if (err) {
      setError(err.message)
    } else {
      setSuccess(true)
      void refetchCompany()
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  const showCompanySetup = Boolean(userId && !companyId)

  return (
    <div className="p-6 max-w-lg space-y-6">
      {showCompanySetup && (
        <div id="sirket-bagla" className="scroll-mt-6">
          <CompanyRegisterForm onSuccess={() => refetchCompany()} />
        </div>
      )}

      {userId && companyId && (
        <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
          <span className="text-slate-500">Bağlı şirket:</span>{" "}
          <code className="text-[11px] text-slate-800">{companyId}</code>
          <Link
            href="/ayarlar/sirket-bilgileri"
            className="ml-3 text-blue-600 hover:underline font-medium"
          >
            Şirket bilgileri →
          </Link>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-800 text-base mb-2">Profil Bilgileri</h2>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
        )}
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
            Kaydedildi.
          </div>
        )}

        <div>
          <Label className="text-xs font-medium text-slate-600">Ad ve Soyad</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5" />
        </div>

        <div>
          <Label className="text-xs font-medium text-slate-600">E-posta</Label>
          <Input value={email} disabled className="mt-1.5 bg-slate-50 text-slate-500" />
          <p className="text-xs text-slate-400 mt-1">E-posta değiştirilemez</p>
        </div>

        <div>
          <Label className="text-xs font-medium text-slate-600">Telefon</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+90 555 000 00 00" className="mt-1.5" />
        </div>

        <Button onClick={() => void handleSave()} disabled={saving} className="w-full gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Kaydet
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-800 text-base mb-2">Şifre Değiştir</h2>
        <p className="text-xs text-slate-500">
          Şifrenizi unuttuysanız{" "}
          <Link href="/login" className="text-blue-600 hover:underline">
            giriş sayfasından
          </Link>{" "}
          sıfırlama bağlantısı isteyebilirsiniz.
        </p>

        {passwordError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{passwordError}</div>
        )}
        {passwordSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
            Şifreniz güncellendi.
          </div>
        )}

        <div>
          <Label className="text-xs font-medium text-slate-600">Yeni Şifre</Label>
          <div className="relative mt-1.5">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="pl-9 pr-10"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              onClick={() => setShowNewPassword(!showNewPassword)}
            >
              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <Label className="text-xs font-medium text-slate-600">Yeni Şifre Tekrar</Label>
          <Input
            type={showNewPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handlePasswordChange()}
            className="mt-1.5"
          />
        </div>

        <Button
          variant="outline"
          onClick={() => void handlePasswordChange()}
          disabled={passwordSaving}
          className="w-full gap-2"
        >
          {passwordSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
          Şifreyi Güncelle
        </Button>
      </div>
    </div>
  )
}
