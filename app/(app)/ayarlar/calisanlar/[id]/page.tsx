"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { supabaseData as supabase } from "@/lib/supabase-data"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Loader2, Trash2, Calendar, Copy, Check, MessageSquare } from "lucide-react"
import { sendTestSmsAction } from "@/lib/sms-actions"
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

export default function CalisanDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [locations, setLocations] = useState<Location[]>([])

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [phoneCode, setPhoneCode] = useState("90")
  const [email, setEmail] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [gender, setGender] = useState("")
  const [language, setLanguage] = useState("tr")
  const [startDate, setStartDate] = useState("")
  const [locationId, setLocationId] = useState("")
  const [status, setStatus] = useState("active")
  const [color, setColor] = useState("#3b82f6")
  const [sms, setSms] = useState(true)
  const [emailNotif, setEmailNotif] = useState(true)
  const [whatsapp, setWhatsapp] = useState(true)
  const [calendarToken, setCalendarToken] = useState("")
  const [calCopied, setCalCopied] = useState(false)
  const [calSmsSending, setCalSmsSending] = useState(false)
  const [calSmsSent, setCalSmsSent] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: emp }, { data: locs }] = await Promise.all([
        supabase.from("employees").select("*").eq("id", id).single(),
        supabase.from("service_locations").select("id, name").order("name"),
      ])
      if (emp) {
        const { first, last } = splitFullNameToParts(emp.full_name || "")
        setFirstName(first)
        setLastName(last)
        const raw = String(emp.phone || "").trim()
        setPhoneCode("90")
        if (raw.startsWith("+90")) {
          setPhone(digitsOnly(raw.slice(3)).replace(/^0+/, "").slice(0, 10))
        } else if (raw.startsWith("+1")) {
          setPhoneCode("1")
          setPhone(digitsOnly(raw.slice(2)).slice(0, 10))
        } else {
          setPhone(digitsOnly(raw).replace(/^0+/, "").slice(0, 10))
        }
        setEmail(emp.email || "")
        setBirthDate(emp.birth_date || "")
        setGender(emp.gender || "")
        setLanguage(emp.language || "tr")
        setStartDate(emp.start_date || "")
        setLocationId(emp.location_id || "")
        setStatus(emp.status || "active")
        setColor(emp.color || "#3b82f6")
        setSms(emp.sms_notification ?? true)
        setEmailNotif(emp.email_notification ?? true)
        setWhatsapp(emp.whatsapp_notification ?? true)
        setCalendarToken(emp.calendar_token || "")
      }
      setLocations(locs || [])
      setLoading(false)
    }
    load()
  }, [id])

  async function handleSave() {
    const fullName = joinNameParts(firstName, lastName)
    if (!fullName.trim()) {
      setError("Ad ve soyad zorunludur.")
      return
    }
    const phoneDigits = digitsOnly(phone)
    const pErr = validateTrNationalPhoneBody(phoneDigits)
    if (pErr) {
      setError(pErr)
      return
    }
    setError("")
    setSaving(true)
    const { error: sbError } = await supabase.from("employees").update({
      full_name: fullName,
      phone: `+${phoneCode}${phoneDigits}`,
      email: email.trim(),
      birth_date: birthDate || null,
      gender: gender || null,
      language,
      start_date: startDate || null,
      location_id: locationId || null,
      status, color,
      sms_notification: sms,
      email_notification: emailNotif,
      whatsapp_notification: whatsapp,
    }).eq("id", id)
    setSaving(false)
    if (sbError) { setError(sbError.message); return }
    setSuccess("Çalışan bilgileri güncellendi.")
    setTimeout(() => setSuccess(""), 3000)
  }

  async function handleDelete() {
    if (!confirm("Bu çalışanı silmek istediğinizden emin misiniz?")) return
    await supabase.from("employees").delete().eq("id", id)
    router.push("/ayarlar/calisanlar")
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  )

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-lg font-semibold text-slate-800">{joinNameParts(firstName, lastName) || "—"}</h1>
            <p className="text-sm text-slate-500">{email}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleDelete}>
          <Trash2 className="h-4 w-4 mr-1" /> Sil
        </Button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{success}</div>}

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label>Ad *</Label>
            <Input className="mt-1.5" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <Label>Soyad *</Label>
            <Input className="mt-1.5" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Telefon</Label>
            <div className="mt-1.5 flex gap-2">
              <Select value={phoneCode} onValueChange={setPhoneCode}>
                <SelectTrigger className="w-[4.5rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="90">+90</SelectItem>
                  <SelectItem value="1">+1</SelectItem>
                </SelectContent>
              </Select>
              <Input
                className="min-w-0 flex-1"
                inputMode="numeric"
                maxLength={10}
                placeholder="10 hane"
                value={phone}
                onChange={(e) => setPhone(digitsOnly(e.target.value).slice(0, 10))}
              />
            </div>
          </div>
          <div>
            <Label>e-Mail</Label>
            <Input className="mt-1.5" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Doğum Tarihi</Label>
            <div className="mt-1.5">
              <DateInput
                value={birthDate}
                onChange={setBirthDate}
                captionLayout="dropdown"
                fromYear={1900}
                toYear={new Date().getFullYear()}
                max={format(new Date(), "yyyy-MM-dd")}
                accent="warm"
                confirmSelection
                confirmLabel="Onayla"
              />
            </div>
          </div>
          <div>
            <Label>Cinsiyet</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Seçin" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Erkek</SelectItem>
                <SelectItem value="female">Kadın</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>İşe Başlangıç</Label>
            <div className="mt-1.5"><DateInput value={startDate} onChange={setStartDate} /></div>
          </div>
          <div>
            <Label>Hizmet Yeri</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Seçin" /></SelectTrigger>
              <SelectContent>
                {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Durum</Label>
          <div className="flex gap-4 mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="status" checked={status === "active"} onChange={() => setStatus("active")} />
              <span className="text-sm">Aktif</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="status" checked={status === "passive"} onChange={() => setStatus("passive")} />
              <span className="text-sm">Pasif</span>
            </label>
          </div>
        </div>
        <ColorPickerField
          label="Renk"
          value={color}
          onChange={setColor}
        />
        <div>
          <Label>Bildirim İzinleri</Label>
          <div className="space-y-2 mt-2">
            <div className="flex items-center gap-3">
              <Switch checked={sms} onCheckedChange={setSms} />
              <span className="text-sm">SMS</span>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
              <span className="text-sm">e-Posta</span>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={whatsapp} onCheckedChange={setWhatsapp} />
              <span className="text-sm">WhatsApp</span>
            </div>
          </div>
        </div>
      </div>

      {calendarToken && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mt-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Takvim Senkronizasyonu
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            Bu linki Google Calendar, Apple Calendar veya Outlook&apos;a ekleyerek çalışanın randevularını takip edebilirsiniz.
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={`${typeof window !== "undefined" ? window.location.origin : ""}/api/calendar/${calendarToken}`}
              className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600 truncate"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/api/calendar/${calendarToken}`)
                setCalCopied(true)
                setTimeout(() => setCalCopied(false), 2000)
              }}
            >
              {calCopied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            <a
              href={`https://calendar.google.com/calendar/r?cid=webcal://${typeof window !== "undefined" ? window.location.host : "localhost:3000"}/api/calendar/${calendarToken}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="text-xs whitespace-nowrap">
                Google Calendar
              </Button>
            </a>
            {phone && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs whitespace-nowrap gap-1"
                disabled={calSmsSending}
                onClick={async () => {
                  setCalSmsSending(true)
                  const link = `${window.location.origin}/api/calendar/${calendarToken}`
                  const fullPhone = `+${phoneCode}${phone}`
                  await sendTestSmsAction(fullPhone, `Takvim linkiniz: ${link}`)
                  setCalSmsSending(false)
                  setCalSmsSent(true)
                  setTimeout(() => setCalSmsSent(false), 3000)
                }}
              >
                {calSmsSending ? <Loader2 className="h-3 w-3 animate-spin" /> : calSmsSent ? <Check className="h-3 w-3 text-green-600" /> : <MessageSquare className="h-3 w-3" />}
                {calSmsSent ? "Gönderildi" : "SMS ile Gönder"}
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={() => router.back()}>Vazgeç</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Kaydet
        </Button>
      </div>
    </div>
  )
}
