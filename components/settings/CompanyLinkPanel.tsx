"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Building2, Link2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type Props = {
  /** Bağlantı başarılı olunca (ör. useCompany().refetch) */
  onSuccess?: () => void
  className?: string
  id?: string
}

export function CompanyLinkPanel({ onSuccess, className, id }: Props) {
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [linkUuid, setLinkUuid] = useState("")
  const [linking, setLinking] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState("")
  const [creating, setCreating] = useState(false)

  function notifySuccess() {
    setSuccess(true)
    onSuccess?.()
    setTimeout(() => setSuccess(false), 4000)
  }

  async function handleLinkCompany() {
    setError("")
    const id = linkUuid.trim()
    if (!UUID_RE.test(id)) {
      setError("Geçerli bir UUID girin (Supabase → Table Editor → companies → id).")
      return
    }

    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      setError("Oturum bulunamadı.")
      return
    }

    setLinking(true)
    const { data: updated, error: err } = await supabase
      .from("profiles")
      .update({ company_id: id })
      .eq("id", userData.user.id)
      .select("id")
      .maybeSingle()

    setLinking(false)

    if (err) {
      setError(
        err.message.includes("foreign key") || err.code === "23503"
          ? "Bu UUID companies tablosunda yok veya company_id sütunu reddedildi."
          : err.message,
      )
      return
    }

    if (!updated) {
      setError(
        "Profil satırı bulunamadı veya güncellenemedi. auth.users ile aynı id'de profiles kaydı olmalı. " +
          "Supabase SQL Editor'da supabase/profiles_select_own.sql çalıştırıp tekrar deneyin.",
      )
      return
    }

    setLinkUuid("")
    notifySuccess()
  }

  async function createWithName(name: string) {
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      setError("Şirket adı en az 2 karakter olmalı.")
      return
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) {
      setError("Oturum bulunamadı; yeniden giriş yapın.")
      return
    }

    setCreating(true)
    setError("")
    try {
      const res = await fetch("/api/profile-company", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ companyName: trimmed }),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(json.error || "Şirket oluşturulamadı.")
        return
      }
      setNewCompanyName("")
      notifySuccess()
    } catch {
      setError("Bağlantı hatası.")
    } finally {
      setCreating(false)
    }
  }

  async function handleCreateCompany() {
    await createWithName(newCompanyName)
  }

  async function handleQuickStart() {
    setError("")
    const { data: userData } = await supabase.auth.getUser()
    const email = userData.user?.email
    if (!email) {
      setError("E-posta bulunamadı.")
      return
    }
    const local = email.split("@")[0]?.trim() || "İşletme"
    const name = `${local.charAt(0).toUpperCase()}${local.slice(1)} İşletmesi`
    await createWithName(name)
  }

  return (
    <div
      id={id}
      className={cn(
        "rounded-xl border border-amber-200 bg-amber-50/90 p-5 sm:p-6 space-y-4 text-left max-w-xl mx-auto scroll-mt-6",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <Building2 className="h-5 w-5 text-amber-800 shrink-0 mt-0.5" />
        <div>
          <h2 className="font-semibold text-amber-950 text-sm">Şirketinizi bağlayın</h2>
          <p className="text-xs text-amber-900/85 mt-1 leading-relaxed">
            Bu sayfada kalıp aşağıdan mevcut bir <code className="text-[11px] bg-amber-100/90 px-1 rounded">companies.id</code>{" "}
            yapıştırabilir veya yeni şirket oluşturabilirsiniz. Yeni şirket için sunucuda{" "}
            <code className="text-[11px]">SUPABASE_SERVICE_ROLE_KEY</code> gerekir.
          </p>
        </div>
      </div>

      {success && (
        <div className="p-3 bg-emerald-100/80 border border-emerald-200 rounded-lg text-sm text-emerald-900">
          Bağlantı tamam. Sayfa yenileniyor…
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 whitespace-pre-wrap">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-amber-200/80 bg-white/80 p-4 space-y-3">
        <p className="text-xs font-medium text-amber-950">Hızlı başlangıç</p>
        <p className="text-[11px] text-amber-900/80">
          Tek tıkla e-postanıza göre varsayılan isimle şirket oluşturur ve profilinize bağlar.
        </p>
        <Button
          type="button"
          onClick={() => void handleQuickStart()}
          disabled={creating || linking}
          className="w-full sm:w-auto gap-2 bg-emerald-600 hover:bg-emerald-700"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Hızlı başlat (otomatik şirket)
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium text-amber-950">Mevcut şirkete bağlan (UUID)</Label>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={linkUuid}
            onChange={(e) => setLinkUuid(e.target.value)}
            placeholder="companies.id — UUID yapıştırın"
            className="font-mono text-xs bg-white flex-1"
          />
          <Button
            type="button"
            onClick={() => void handleLinkCompany()}
            disabled={linking || creating}
            className="shrink-0 gap-1.5 bg-amber-800 hover:bg-amber-900"
          >
            {linking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            Bağla
          </Button>
        </div>
      </div>

      <div className="border-t border-amber-200/80 pt-4 space-y-2">
        <Label className="text-xs font-medium text-amber-950">Yeni şirket (ünvan)</Label>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={newCompanyName}
            onChange={(e) => setNewCompanyName(e.target.value)}
            placeholder="Örn. Örnek Sağlık Merkezi"
            className="bg-white flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleCreateCompany()}
            disabled={creating || linking}
            className="shrink-0 border-amber-400"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Oluştur"}
          </Button>
        </div>
      </div>

      <p className="text-[11px] text-amber-900/75">
        Profil satırınız yoksa veya güncellenmiyorsa Supabase SQL Editor&apos;da{" "}
        <code className="bg-amber-100/80 px-1 rounded">supabase/profiles_select_own.sql</code> dosyasını çalıştırın.
      </p>
    </div>
  )
}
