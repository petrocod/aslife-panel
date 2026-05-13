"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { supabaseData as supabase } from "@/lib/supabase-data"
import { Loader2 } from "lucide-react"
import { NotificationSection } from "@/components/shared/NotificationSection"
import { DateInput } from "@/components/shared/DateInput"
import { format } from "date-fns"
import {
  digitsOnly,
  joinNameParts,
  splitFullNameToParts,
  validateTcKimlikOptional,
  validateTrNationalPhoneBody,
} from "@/lib/validation/tr-customer-fields"

const TURKEY_CITIES = ["Adana","Adıyaman","Afyonkarahisar","Ağrı","Amasya","Ankara","Antalya","Artvin","Aydın","Balıkesir","Bilecik","Bingöl","Bitlis","Bolu","Burdur","Bursa","Çanakkale","Çankırı","Çorum","Denizli","Diyarbakır","Düzce","Edirne","Elazığ","Erzincan","Erzurum","Eskişehir","Gaziantep","Giresun","Gümüşhane","Hakkari","Hatay","Iğdır","Isparta","İstanbul","İzmir","Kahramanmaraş","Karabük","Karaman","Kars","Kastamonu","Kayseri","Kırıkkale","Kırklareli","Kırşehir","Kilis","Kocaeli","Konya","Kütahya","Malatya","Manisa","Mardin","Mersin","Muğla","Muş","Nevşehir","Niğde","Ordu","Osmaniye","Rize","Sakarya","Samsun","Siirt","Sinop","Sivas","Şanlıurfa","Şırnak","Tekirdağ","Tokat","Trabzon","Tunceli","Uşak","Van","Yalova","Yozgat","Zonguldak"]

export default function MusteriDuzenlePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading]   = useState(true)
  const [saving,  setSaving]    = useState(false)
  const [error,   setError]     = useState("")

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [phoneCode, setPhoneCode] = useState("90")
  const [email,            setEmail]            = useState("")
  const [birthDate,        setBirthDate]        = useState("")
  const [gender,           setGender]           = useState("")
  const [tcNo,             setTcNo]             = useState("")
  const [language,         setLanguage]         = useState("tr")
  const [city,             setCity]             = useState("")
  const [district,         setDistrict]         = useState("")
  const [address,          setAddress]          = useState("")
  const [smsConsent,       setSmsConsent]       = useState(true)
  const [emailConsent,     setEmailConsent]     = useState(true)
  const [whatsappConsent,  setWhatsappConsent]  = useState(true)

  useEffect(() => {
    supabase.from("customers").select("*").eq("id", id).single()
      .then(({ data }) => {
        if (data) {
          const { first, last } = splitFullNameToParts(data.full_name || "")
          setFirstName(first)
          setLastName(last)
          const rawPhone = String(data.phone || "").trim()
          if (rawPhone.startsWith("+")) {
            const rest = rawPhone.slice(1)
            const one = rest.match(/^(1|44|49|33)(.*)$/)
            const two = rest.match(/^(\d{2})(\d{10,})$/)
            if (one) {
              setPhoneCode(one[1])
              setPhone(digitsOnly(one[2]).slice(0, 10))
            } else if (two && two[1] === "90") {
              setPhoneCode("90")
              setPhone(digitsOnly(two[2]).slice(0, 10))
            } else {
              setPhoneCode("90")
              setPhone(digitsOnly(rest).slice(0, 10))
            }
          } else {
            setPhoneCode("90")
            setPhone(digitsOnly(rawPhone).replace(/^0+/, "").slice(0, 10))
          }
          setEmail(data.email || "")
          setBirthDate(data.birth_date || "")
          setGender(data.gender || "")
          setTcNo(digitsOnly(String(data.tc_no ?? "")))
          setLanguage(data.language || "tr")
          setCity(data.city || "")
          setDistrict(data.district || "")
          setAddress(data.address || "")
          setSmsConsent(data.sms_consent ?? true)
          setEmailConsent(data.email_consent ?? true)
          setWhatsappConsent(data.whatsapp_consent ?? true)
        }
        setLoading(false)
      })
  }, [id])

  async function handleSave() {
    const fullName = joinNameParts(firstName, lastName)
    if (!fullName) {
      setError("Ad ve soyad zorunludur.")
      return
    }
    const phoneDigits = digitsOnly(phone)
    const phoneErr = validateTrNationalPhoneBody(phoneDigits)
    if (phoneErr) {
      setError(phoneErr)
      return
    }
    const tcErr = validateTcKimlikOptional(tcNo)
    if (tcErr) {
      setError(tcErr)
      return
    }
    setError("")
    setSaving(true)

    const { error: sbError } = await supabase.from("customers").update({
      full_name: fullName,
      phone: `+${phoneCode}${phoneDigits}`,
      email:            email.trim() || null,
      birth_date:       birthDate || null,
      gender:           gender || null,
      tc_no: digitsOnly(tcNo) || null,
      language,
      city:             city || null,
      district:         district || null,
      address:          address || null,
      sms_consent:      smsConsent,
      email_consent:    emailConsent,
      whatsapp_consent: whatsappConsent,
    }).eq("id", id)

    setSaving(false)
    if (sbError) { setError(sbError.message); return }
    router.push(`/musteriler/${id}`)
    router.refresh()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  )

  return (
    <div className="p-6 max-w-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs text-slate-500 mb-5">
        <Link href="/musteriler" className="hover:text-blue-600">Müşteriler</Link>
        <span>/</span>
        <Link href={`/musteriler/${id}`} className="hover:text-blue-600">{joinNameParts(firstName, lastName) || "…"}</Link>
        <span>/</span>
        <span className="text-slate-700 font-medium">Düzenle</span>
      </div>

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
                <SelectItem value="44">+44</SelectItem>
                <SelectItem value="49">+49</SelectItem>
                <SelectItem value="33">+33</SelectItem>
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
          <Label className="text-sm text-slate-600">e-Mail</Label>
          <Input placeholder="e-Posta adresi" className="mt-1.5" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
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
          <Label className="text-sm text-slate-600">T.C kimlik numarası</Label>
          <Input
            placeholder="İsteğe bağlı, 11 rakam"
            className="mt-1.5"
            inputMode="numeric"
            maxLength={11}
            value={tcNo}
            onChange={(e) => setTcNo(digitsOnly(e.target.value).slice(0, 11))}
          />
        </div>

        <div>
          <Label className="text-sm text-slate-600">Dil</Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tr">Türkçe</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="de">Deutsch</SelectItem>
              <SelectItem value="fr">Français</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm text-slate-600">Adres</Label>
          <div className="grid grid-cols-2 gap-2 mt-1.5">
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger><SelectValue placeholder="İl seçin" /></SelectTrigger>
              <SelectContent>
                {TURKEY_CITIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="İlçe girin" value={district} onChange={(e) => setDistrict(e.target.value)} />
          </div>
          <Textarea placeholder="Açık adres" className="mt-2" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>

        <NotificationSection
          smsConsent={smsConsent}
          emailConsent={emailConsent}
          whatsappConsent={whatsappConsent}
          onSmsChange={setSmsConsent}
          onEmailChange={setEmailConsent}
          onWhatsappChange={setWhatsappConsent}
        />
      </div>

      <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-200">
        <Button variant="outline" onClick={() => router.back()} disabled={saving}>Vazgeç</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Kaydet
        </Button>
      </div>
    </div>
  )
}
