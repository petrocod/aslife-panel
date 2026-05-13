"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase-client"
import { loadCompanyBestEffort, saveCompanyBestEffort } from "@/lib/company-db"
import { useCompany } from "@/hooks/useCompany"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, ArrowLeft, Plus, Save } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

const STORAGE_BUCKET = "company-logos"

const SERVICE_TYPES = [
  "Sağlık Merkezi",
  "Sağlık Merkezleri",
  "Spor Salonu",
  "Güzellik Merkezi",
  "Fizyoterapi",
  "Diğer",
]

export default function SirketBilgileriDuzenle() {
  const { companyId, loading: authLoading } = useCompany()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [schemaNotice, setSchemaNotice] = useState("")

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
  /** Storage yok / RLS hata: logo data: URL ile DB'ye gider */
  const [logoStorageHint, setLogoStorageHint] = useState("")

  useEffect(() => {
    if (authLoading) return

    if (!companyId) {
      setLoading(false)
      setError("")
      return
    }

    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const { data, error: fetchErr } = await loadCompanyBestEffort(supabase, companyId)
        if (cancelled) return
        if (fetchErr) {
          setError(fetchErr || "Kayıt yüklenemedi.")
        } else if (data) {
          setError("")
          setName(String(data.name ?? ""))
          setPhone(String(data.phone ?? ""))
          setEmail(String(data.email ?? ""))
          setAddress(String(data.address ?? ""))
          setLocation(String(data.location ?? ""))
          setAuthorized(String(data.authorized ?? ""))
          setFoundedAt(data.founded_at ? String(data.founded_at).slice(0, 10) : "")
          setWebsite(String(data.website ?? ""))
          setTcNo(String(data.tc_no ?? ""))
          setTaxNumber(String(data.tax_number ?? ""))
          setTaxOffice(String(data.tax_office ?? ""))
          setInvoiceAddress(String(data.invoice_address ?? ""))
          setCurrency(String(data.currency ?? "TRY"))
          setServiceType(String(data.service_type ?? "Sağlık Merkezi"))
          setLanguage(String(data.language ?? "tr"))
          setTimezone(String(data.timezone ?? "Europe/Istanbul"))
          setLogoUrl(String(data.logo_url ?? ""))
        } else {
          setError("Şirket kaydı bulunamadı.")
        }
      } catch {
        if (!cancelled) setError("Bağlantı hatası.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [companyId, authLoading])

  function tryDataUrlFallback(file: File, storageErr: string) {
    const maxEmbed = 750_000
    if (file.size > maxEmbed) {
      setUploadingLogo(false)
      setLogoStorageHint("")
      setError("Logo yüklenemedi. Dosya çok büyük, lütfen daha küçük bir resim deneyin.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== "string") {
        setUploadingLogo(false)
        setError("Logo okunamadı.")
        return
      }
      setLogoUrl(result)
      setLogoStorageHint("Logo geçici olarak kaydedilecek. Kalıcı kayıt için lütfen destek ile iletişime geçin.")
      setError("")
      setUploadingLogo(false)
    }
    reader.onerror = () => {
      setUploadingLogo(false)
      setError(`Storage: ${storageErr}`)
    }
    reader.readAsDataURL(file)
  }

  async function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !companyId) return
    if (!file.type.startsWith("image/")) {
      setError("Lütfen bir resim dosyası seçin.")
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      setError("Logo en fazla 3 MB olabilir.")
      return
    }

    setUploadingLogo(true)
    setError("")
    setLogoStorageHint("")
    const ext = file.name.split(".").pop()?.toLowerCase() || "png"
    const path = `${companyId}/logo.${ext}`

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      setUploadingLogo(false)
      setError("Logo yüklemek için giriş yapmalısınız.")
      return
    }

    // 1) Sunucu (service_role) — Storage RLS sorunlarını aşar; .env.local → SUPABASE_SERVICE_ROLE_KEY
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("companyId", companyId)
      const apiRes = await fetch("/api/company-logo", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: fd,
      })
      const apiJson = (await apiRes.json().catch(() => ({}))) as {
        publicUrl?: string
        error?: string
        hint?: string
        code?: string
      }
      if (apiRes.ok && apiJson.publicUrl) {
        setLogoUrl(apiJson.publicUrl)
        setLogoStorageHint("")
        setError("")
        setUploadingLogo(false)
        return
      }
      if (apiJson.code === "NO_SERVICE_ROLE" || apiJson.error) {
        setLogoStorageHint("Logo yüklenemedi. Lütfen tekrar deneyin.")
      }
    } catch {
      setLogoStorageHint("Logo yüklenemedi. Lütfen tekrar deneyin.")
    }

    // 2) İstemci Storage (bucket + RLS gerekli)
    const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
      upsert: true,
      contentType: file.type,
    })

    if (upErr) {
      const msg = upErr.message || String(upErr)
      if (
        msg.includes("Bucket not found") ||
        msg.includes("row-level security") ||
        msg.includes("RLS") ||
        msg.includes("violates row-level security") ||
        msg.includes("JWT") ||
        msg.includes("not authorized")
      ) {
        tryDataUrlFallback(file, msg)
        return
      }
      setUploadingLogo(false)
      setError("Logo yüklenemedi. Lütfen tekrar deneyin veya destek ile iletişime geçin.")
      return
    }

    const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
    setLogoUrl(pub.publicUrl)
    setLogoStorageHint("")
    setUploadingLogo(false)
  }

  const serviceTypeOptions = useMemo(() => {
    if (serviceType && !SERVICE_TYPES.includes(serviceType)) {
      return [...SERVICE_TYPES, serviceType]
    }
    return SERVICE_TYPES
  }, [serviceType])

  async function handleSave() {
    if (!companyId) return
    setSaving(true)
    setError("")
    setSchemaNotice("")
    const payload = {
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
      location: location.trim() || null,
      authorized: authorized.trim() || null,
      founded_at: foundedAt || null,
      website: website.trim() || null,
      tc_no: tcNo.trim() || null,
      tax_number: taxNumber.trim() || null,
      tax_office: taxOffice.trim() || null,
      invoice_address: invoiceAddress.trim() || null,
      currency,
      service_type: serviceType || null,
      language,
      timezone,
      logo_url: logoUrl.trim() || null,
    }

    const { error: errMsg, strippedColumns } = await saveCompanyBestEffort(supabase, companyId, payload)

    setSaving(false)
    if (errMsg) {
      setError(errMsg)
      return
    }
    if (strippedColumns.length > 0) {
      setSchemaNotice("Bazı alanlar kaydedilemedi. Lütfen destek ile iletişime geçin.")
    }
    setSuccess(true)
    setTimeout(() => router.push("/ayarlar/sirket-bilgileri"), strippedColumns.length > 0 ? 2500 : 1500)
  }

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!companyId) {
    return (
      <div className="p-6 max-w-lg">
        <p className="text-sm text-slate-700 mb-3">Önce şirket kaydı oluşturmalısınız.</p>
        <Button asChild className="bg-blue-600 hover:bg-blue-700">
          <Link href="/ayarlar/sirket-bilgileri">Şirket bilgileri sayfasına git</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/ayarlar/sirket-bilgileri">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h2 className="font-semibold text-slate-800">Şirket Bilgilerini Düzenle</h2>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5 shadow-sm">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 whitespace-pre-wrap">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
            Kaydedildi! Yönlendiriliyorsunuz...
          </div>
        )}
        {schemaNotice && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 whitespace-pre-wrap">
            {schemaNotice}
          </div>
        )}
        {logoStorageHint && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 whitespace-pre-wrap">
            {logoStorageHint}
          </div>
        )}

        <div id="logo" className="scroll-mt-24 pb-5 border-b border-slate-100">
          <Label className="text-xs font-medium text-slate-600">Şirket logosu</Label>
          <p className="text-[11px] text-slate-500 mt-0.5 mb-3">
            Bir resim yükleyin.
          </p>
          <div className="flex justify-start">
            <div className="relative shrink-0">
              <div
                className={cn(
                  "h-24 w-24 rounded-full border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center"
                )}
              >
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-slate-300">
                    {name.trim()[0]?.toLocaleUpperCase("tr-TR") || "?"}
                  </span>
                )}
              </div>
              <button
                type="button"
                disabled={uploadingLogo}
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md ring-2 ring-white transition hover:bg-emerald-600 disabled:opacity-60"
                title="Logo yükle"
              >
                {uploadingLogo ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-5 w-5" strokeWidth={2.5} />
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                className="sr-only"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleLogoFile}
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
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1.5"
              placeholder="+90 212 000 00 00"
            />
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
          <Input value={website} onChange={(e) => setWebsite(e.target.value)} className="mt-1.5" placeholder="https://..." />
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

        <Button onClick={handleSave} disabled={saving || !name.trim()} className="w-full gap-2 bg-blue-600 hover:bg-blue-700">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Kaydet
        </Button>
      </div>
    </div>
  )
}
