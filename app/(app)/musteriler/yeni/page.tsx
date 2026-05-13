"use client"

export const dynamic = "force-dynamic"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { supabaseData as supabase } from "@/lib/supabase-data"
import { useCompany, DEMO_COMPANY_ID } from "@/hooks/useCompany"
import { Loader2 } from "lucide-react"
import { NotificationSection } from "@/components/shared/NotificationSection"
import { DateInput } from "@/components/shared/DateInput"
import {
  digitsOnly,
  joinNameParts,
  validateTcKimlikOptional,
  validateTrNationalPhoneBody,
} from "@/lib/validation/tr-customer-fields"

const TURKEY_CITIES = ["Adana","Adıyaman","Afyonkarahisar","Ağrı","Amasya","Ankara","Antalya","Artvin","Aydın","Balıkesir","Bilecik","Bingöl","Bitlis","Bolu","Burdur","Bursa","Çanakkale","Çankırı","Çorum","Denizli","Diyarbakır","Düzce","Edirne","Elazığ","Erzincan","Erzurum","Eskişehir","Gaziantep","Giresun","Gümüşhane","Hakkari","Hatay","Iğdır","Isparta","İstanbul","İzmir","Kahramanmaraş","Karabük","Karaman","Kars","Kastamonu","Kayseri","Kırıkkale","Kırklareli","Kırşehir","Kilis","Kocaeli","Konya","Kütahya","Malatya","Manisa","Mardin","Mersin","Muğla","Muş","Nevşehir","Niğde","Ordu","Osmaniye","Rize","Sakarya","Samsun","Siirt","Sinop","Sivas","Şanlıurfa","Şırnak","Tekirdağ","Tokat","Trabzon","Tunceli","Uşak","Van","Yalova","Yozgat","Zonguldak"]

export default function YeniMusteriPage() {
  const router = useRouter()
  const { companyId } = useCompany()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [phoneCode, setPhoneCode] = useState("90")
  const [email, setEmail] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [gender, setGender] = useState("")
  const [tcNo, setTcNo] = useState("")
  const [language, setLanguage] = useState("tr")
  const [city, setCity] = useState("")
  const [district, setDistrict] = useState("")
  const [address, setAddress] = useState("")
  const [smsConsent, setSmsConsent] = useState(true)
  const [emailConsent, setEmailConsent] = useState(true)
  const [whatsappConsent, setWhatsappConsent] = useState(true)

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
    setLoading(true)

    const { error: sbError } = await supabase.from("customers").insert({
      company_id: companyId || DEMO_COMPANY_ID,
      full_name: fullName,
      phone: `+${phoneCode}${phoneDigits}`,
      email: email.trim() || null,
      birth_date: birthDate || null,
      gender: gender || null,
      tc_no: digitsOnly(tcNo) || null,
      language,
      city: city || null,
      district: district || null,
      address: address || null,
      sms_consent: smsConsent,
      email_consent: emailConsent,
      whatsapp_consent: whatsappConsent,
    })

    setLoading(false)

    if (sbError) {
      setError(sbError.message)
      return
    }

    if ((smsConsent || emailConsent || whatsappConsent) && phoneDigits) {
      fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: companyId || DEMO_COMPANY_ID,
          templateKey: "yeni-musteri",
          customerName: fullName,
          customerPhone: `${phoneCode}${phoneDigits}`,
          customerEmail: email.trim() || null,
          params: {},
        }),
      }).catch(() => {})
    }

    router.push("/musteriler")
    router.refresh()
  }

  return (
    <div className="p-6 max-w-2xl">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
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
              placeholder="10 hane, 0 ile başlamaz (örn. 5XXXXXXXXX)"
              className="flex-1"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(digitsOnly(e.target.value).slice(0, 10))}
            />
          </div>
        </div>

        <div>
          <Label className="text-sm text-slate-600">e-Mail</Label>
          <Input
            placeholder="e-Posta adresi girin"
            className="mt-1.5"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
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
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Cinsiyet seçin" />
            </SelectTrigger>
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
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
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
            <Input
              placeholder="İlçe girin"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
            />
          </div>
          <Textarea
            placeholder="Açık adres"
            className="mt-2"
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
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
        <Button variant="outline" onClick={() => router.back()} disabled={loading}>Vazgeç</Button>
        <Button onClick={handleSave} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Kaydet
        </Button>
      </div>
    </div>
  )
}
