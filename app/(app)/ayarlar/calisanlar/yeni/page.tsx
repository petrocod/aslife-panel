"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabaseData as supabase } from "@/lib/supabase-data"
import { useCompany, DEMO_COMPANY_ID } from "@/hooks/useCompany"
import { useSubscription } from "@/hooks/useSubscription"
import { canAddEmployees } from "@/lib/subscription"
import { Loader2 } from "lucide-react"
import { NotificationSection } from "@/components/shared/NotificationSection"
import { DateInput } from "@/components/shared/DateInput"
import { format } from "date-fns"
import { ColorPickerField } from "@/components/shared/ColorPickerField"
import {
  digitsOnly,
  joinNameParts,
  splitFullNameToParts,
  validateTrNationalPhoneBody,
} from "@/lib/validation/tr-customer-fields"

type Location = { id: string; name: string }

export default function YeniCalisanPage() {
  const router = useRouter()
  const { companyId } = useCompany()
  const sub = useSubscription()
  const [empCount, setEmpCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [locations, setLocations] = useState<Location[]>([])

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [phoneCode, setPhoneCode] = useState("90")
  const [email, setEmail] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [gender, setGender] = useState("")
  const [language, setLanguage] = useState("en")
  const [startDate, setStartDate] = useState("")
  const [locationId, setLocationId] = useState("")
  const [status, setStatus] = useState("active")
  const [sms, setSms] = useState(true)
  const [emailNotif, setEmailNotif] = useState(true)
  const [whatsapp, setWhatsapp] = useState(true)
  const [color, setColor] = useState("#3b82f6")

  useEffect(() => {
    async function load() {
      const { data: locs } = await supabase.from("service_locations").select("id, name").order("name")
      setLocations(locs || [])
    }
    load()
  }, [])

  useEffect(() => {
    if (!companyId || companyId === DEMO_COMPANY_ID) {
      setEmpCount(0)
      return
    }
    void supabase
      .from("employees")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .then(({ count }) => setEmpCount(count ?? 0))
  }, [companyId])

  const staffBlocked =
    Boolean(companyId && companyId !== DEMO_COMPANY_ID) &&
    !sub.loading &&
    !canAddEmployees(empCount, sub.maxUsers)

  async function handleSave() {
    if (staffBlocked) {
      setError("Plandaki çalışan limitine ulaştınız. Yükseltmek için Plan seç sayfasına gidin.")
      return
    }
    const fullName = joinNameParts(firstName, lastName)
    if (!fullName) {
      setError("Ad ve soyad zorunludur.")
      return
    }
    const phoneDigits = digitsOnly(phone)
    const pErr = validateTrNationalPhoneBody(phoneDigits)
    if (pErr) {
      setError(pErr)
      return
    }
    if (!email.trim()) { setError("e-Mail zorunludur."); return }
    setError("")
    setLoading(true)

    const { error: sbError } = await supabase.from("employees").insert({
      company_id: companyId || DEMO_COMPANY_ID,
      full_name: fullName,
      phone: `+${phoneCode}${phoneDigits}`,
      email: email.trim(),
      birth_date: birthDate || null,
      gender: gender || null,
      language,
      start_date: startDate || null,
      location_id: locationId || null,
      status,
      sms_notification: sms,
      email_notification: emailNotif,
      whatsapp_notification: whatsapp,
      color,
    })

    setLoading(false)
    if (sbError) { setError(sbError.message); return }
    router.push("/ayarlar/calisanlar")
    router.refresh()
  }

  return (
    <div className="p-6 max-w-2xl">
      {staffBlocked && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-950 space-y-2">
          <p className="font-medium">
            {sub.maxUsers <= 1
              ? "Tek kullanıcı planında çalışan eklenemez."
              : "Bu plandaki çalışan kotası doldu."}
          </p>
          <Link href="/hesabim/plan-sec" className="inline-flex text-amber-800 font-semibold underline underline-offset-2">
            Daha fazla kullanıcı için plan yükseltin →
          </Link>
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
      )}

      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-sm text-slate-600">Ad *</Label>
            <Input
              placeholder="Ad"
              className="mt-1.5"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
            />
          </div>
          <div>
            <Label className="text-sm text-slate-600">Soyad *</Label>
            <Input
              placeholder="Soyad"
              className="mt-1.5"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
            />
          </div>
        </div>

        <div>
          <Label className="text-sm text-slate-600">Telefon numarası *</Label>
          <div className="flex gap-2 mt-1.5">
            <Select value={phoneCode} onValueChange={setPhoneCode}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="90">+90</SelectItem>
                <SelectItem value="1">+1</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="10 hane, 0 ile başlamaz"
              className="flex-1"
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(digitsOnly(e.target.value).slice(0, 10))}
            />
          </div>
        </div>

        <div>
          <Label className="text-sm text-slate-600">e-Mail *</Label>
          <Input placeholder="e-Posta adresi girin" className="mt-1.5" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div>
          <Label className="text-sm text-slate-600">Doğum tarihi</Label>
          <DateInput
            value={birthDate}
            onChange={setBirthDate}
            className="mt-1.5"
            captionLayout="dropdown"
            fromYear={1900}
            toYear={new Date().getFullYear()}
            max={format(new Date(), "yyyy-MM-dd")}
            accent="warm"
            confirmSelection
            confirmLabel="Onayla"
          />
        </div>

        <div>
          <Label className="text-sm text-slate-600">Cinsiyet</Label>
          <Select value={gender} onValueChange={setGender}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Cinsiyet seçin" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Erkek</SelectItem>
              <SelectItem value="female">Kadın</SelectItem>
              <SelectItem value="other">Diğer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm text-slate-600">Dil</Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tr">Türkçe</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm text-slate-600">İşe başlangıç tarihi</Label>
          <DateInput value={startDate} onChange={setStartDate} className="mt-1.5" />
        </div>

        <div>
          <Label className="text-sm text-slate-600">Hizmet yeri</Label>
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Hizmet yeri seçin" /></SelectTrigger>
            <SelectContent>
              {locations.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm text-slate-600">Durumu</Label>
          <div className="flex gap-4 mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="status" value="active" checked={status === "active"} onChange={() => setStatus("active")} />
              <span className="text-sm">Aktif</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="status" value="passive" checked={status === "passive"} onChange={() => setStatus("passive")} />
              <span className="text-sm">Pasif</span>
            </label>
          </div>
        </div>

        <ColorPickerField
          label="Renk"
          value={color}
          onChange={setColor}
        />
        <NotificationSection
          smsConsent={sms}
          emailConsent={emailNotif}
          whatsappConsent={whatsapp}
          onSmsChange={setSms}
          onEmailChange={setEmailNotif}
          onWhatsappChange={setWhatsapp}
          title="Çalışan Bildirim İzinleri"
        />
      </div>

      <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-200">
        <Button variant="outline" onClick={() => router.back()} disabled={loading}>Vazgeç</Button>
        <Button onClick={handleSave} disabled={loading || staffBlocked}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Kaydet
        </Button>
      </div>
    </div>
  )
}
