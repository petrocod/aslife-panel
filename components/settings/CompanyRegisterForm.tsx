"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CompanyLinkPanel } from "@/components/settings/CompanyLinkPanel"
import { Loader2, Plus, Save, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const SERVICE_TYPES = [
  "Sağlık Merkezi",
  "Sağlık Merkezleri",
  "Spor Salonu",
  "Güzellik Merkezi",
  "Fizyoterapi",
  "Diğer",
]

type Props = {
  onSuccess?: () => void
  className?: string
}

export function CompanyRegisterForm({ onSuccess, className }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")
  const [location, setLocation] = useState("")
  const [authorized, setAuthorized] = useState("")
  const [foundedAt, setFoundedAt] = useState("")
  const [website, setWebsite] = useState("")
  const [tcNo, setTcNo] = useState("")
  const [taxNumber, setTaxNumber] = useState("")
  const [taxOffice, setTaxOffice] = useState("")
  const [invoiceAddress, setInvoiceAddress] = useState("")
  const [currency, setCurrency] = useState("TRY")
  const [serviceType, setServiceType] = useState("Sağlık Merkezi")
  const [language, setLanguage] = useState("tr")
  const [timezone, setTimezone] = useState("Europe/Istanbul")
  const [logoUrl, setLogoUrl] = useState("")

  const [showUuidHelp, setShowUuidHelp] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user
      if (!u) return
      setEmail((prev) => prev || u.email || "")
      const meta = u.user_metadata as { full_name?: string } | undefined
      const fn = meta?.full_name?.trim()
      if (fn) {
        setAuthorized((prev) => prev || fn)
        setName((prev) => prev || `${fn} İşletmesi`)
      }
    })
  }, [])

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null)
      return
    }
    const url = URL.createObjectURL(logoFile)
    setLogoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [logoFile])

  const serviceTypeOptions = useMemo(() => {
    if (serviceType && !SERVICE_TYPES.includes(serviceType)) {
      return [...SERVICE_TYPES, serviceType]
    }
    return SERVICE_TYPES
  }, [serviceType])

  function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ""
    if (!f) return
    if (!f.type.startsWith("image/")) {
      setError("Logo için bir resim dosyası seçin.")
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("Logo en fazla 5 MB olabilir.")
      return
    }
    setError("")
    setLogoFile(f)
  }

  async function handleSubmit() {
    setError("")
    if (!name.trim()) {
      setError("Şirket ünvanı zorunludur.")
      return
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) {
      setError("Oturum bulunamadı; yeniden giriş yapın.")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/profile-company", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          companyName: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          location: location.trim() || undefined,
          authorized: authorized.trim() || undefined,
          founded_at: foundedAt || null,
          website: website.trim() || undefined,
          tc_no: tcNo.trim() || undefined,
          tax_number: taxNumber.trim() || undefined,
          tax_office: taxOffice.trim() || undefined,
          invoice_address: invoiceAddress.trim() || undefined,
          currency,
          service_type: serviceType,
          language,
          timezone,
          logo_url: logoUrl.trim() || undefined,
        }),
      })

      const json = (await res.json()) as { error?: string; companyId?: string }
      if (!res.ok) {
        setError(json.error || "Kayıt başarısız.")
        return
      }

      const companyId = json.companyId
      if (companyId && logoFile) {
        const fd = new FormData()
        fd.append("file", logoFile)
        fd.append("companyId", companyId)
        const logoRes = await fetch("/api/company-logo", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        })
        const logoJson = (await logoRes.json().catch(() => ({}))) as { error?: string; publicUrl?: string }
        if (!logoRes.ok) {
          setError(
            `Şirket oluşturuldu; logo yüklenemedi: ${logoJson.error || logoRes.statusText}. Düzenle sayfasından tekrar deneyin.`,
          )
          onSuccess?.()
          return
        }
        if (logoJson.publicUrl) setLogoUrl(logoJson.publicUrl)
      }

      setLogoFile(null)
      onSuccess?.()
    } catch {
      setError("Bağlantı hatası.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={cn("space-y-6", className)}>
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Şirket bilgilerinizi girin</h2>
          <p className="text-xs text-slate-500 mt-1">
            Kaydettiğinizde şirket oluşturulur ve hesabınıza bağlanır. Logo için Storage bucket{" "}
            <code className="text-[10px]">company-logos</code> gerekir.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 whitespace-pre-wrap">
            {error}
          </div>
        )}

        <div className="pb-5 border-b border-slate-100">
          <Label className="text-xs font-medium text-slate-600">Şirket logosu</Label>
          <p className="text-[11px] text-slate-500 mt-0.5 mb-3">İsteğe bağlı — dosya yükleyin veya URL yazın.</p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="relative shrink-0">
              <div
                className={cn(
                  "h-24 w-24 rounded-full border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center",
                )}
              >
                {logoPreview || logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoPreview || logoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-slate-300">
                    {name.trim()[0]?.toLocaleUpperCase("tr-TR") || "?"}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md ring-2 ring-white hover:bg-emerald-600"
                title="Logo seç"
              >
                <Plus className="h-5 w-5" strokeWidth={2.5} />
              </button>
              <input
                ref={fileRef}
                type="file"
                className="sr-only"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={onPickLogo}
              />
            </div>
            <div className="flex-1 w-full min-w-0">
              <Label className="text-xs text-slate-500">Logo URL (isteğe bağlı)</Label>
              <Input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://..."
                className="font-mono text-sm mt-1"
              />
            </div>
          </div>
        </div>

        <div>
          <Label className="text-xs font-medium text-slate-600">Şirket ünvanı *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-medium text-slate-600">Telefon</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5" placeholder="+90 …" />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">E-posta</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" type="email" />
          </div>
        </div>

        <div>
          <Label className="text-xs font-medium text-slate-600">Şirket adresi</Label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1.5" />
        </div>

        <div>
          <Label className="text-xs font-medium text-slate-600">Firma konumu</Label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1.5" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-medium text-slate-600">Yetkili kişi</Label>
            <Input value={authorized} onChange={(e) => setAuthorized(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Kuruluş tarihi</Label>
            <Input value={foundedAt} onChange={(e) => setFoundedAt(e.target.value)} className="mt-1.5" type="date" />
          </div>
        </div>

        <div>
          <Label className="text-xs font-medium text-slate-600">Web sitesi</Label>
          <Input value={website} onChange={(e) => setWebsite(e.target.value)} className="mt-1.5" placeholder="https://…" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-medium text-slate-600">İş yeri sahibi TCKN</Label>
            <Input value={tcNo} onChange={(e) => setTcNo(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Vergi numarası</Label>
            <Input value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} className="mt-1.5" />
          </div>
        </div>

        <div>
          <Label className="text-xs font-medium text-slate-600">Vergi dairesi</Label>
          <Input value={taxOffice} onChange={(e) => setTaxOffice(e.target.value)} className="mt-1.5" />
        </div>

        <div>
          <Label className="text-xs font-medium text-slate-600">Fatura adresi</Label>
          <Input value={invoiceAddress} onChange={(e) => setInvoiceAddress(e.target.value)} className="mt-1.5" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-medium text-slate-600">Para birimi</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TRY">Türk Lirası (₺)</SelectItem>
                <SelectItem value="USD">Dolar ($)</SelectItem>
                <SelectItem value="EUR">Euro (€)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Hizmet türü</Label>
            <Select value={serviceType} onValueChange={setServiceType}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {serviceTypeOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-medium text-slate-600">Dil</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tr">Türkçe</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Zaman dilimi</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Europe/Istanbul">Europe/Istanbul</SelectItem>
                <SelectItem value="Europe/London">Europe/London</SelectItem>
                <SelectItem value="America/New_York">America/New_York</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={saving || !name.trim()}
          className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Şirketi kaydet ve hesabıma bağla
        </Button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50/80">
        <button
          type="button"
          onClick={() => setShowUuidHelp((v) => !v)}
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-slate-700"
        >
          Zaten Supabase&apos;te bir şirket kaydım var (UUID ile bağlan)
          <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", showUuidHelp && "rotate-180")} />
        </button>
        {showUuidHelp && (
          <div className="px-4 pb-4 border-t border-slate-200/80">
            <CompanyLinkPanel onSuccess={onSuccess} className="mt-3 border-amber-200" />
          </div>
        )}
      </div>
    </div>
  )
}
