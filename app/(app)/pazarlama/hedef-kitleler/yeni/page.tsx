"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Calendar, Check, Loader2, MapPin, Save, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DateInput } from "@/components/shared/DateInput"
import { supabaseData as supabase } from "@/lib/supabase-data"
import { DEMO_COMPANY_ID, useCompany } from "@/hooks/useCompany"
import { defaultTargetAudienceFilters, safeParseFilters, summarizeFilters, type TargetAudienceFilters } from "@/lib/target-audience"

type NamedItem = { id: string; name: string }
type AudienceStatus = "draft" | "active"

const FILTER_STEPS = [
  { id: "time", label: "Zaman", icon: Calendar },
  { id: "customer", label: "Müşteri", icon: Users },
  { id: "services", label: "Hizmetler", icon: Check },
  { id: "visit", label: "Ziyaret Sıklığı", icon: ArrowRight },
  { id: "purchase", label: "Satın Alma Tutarı", icon: Save },
  { id: "location", label: "Lokasyon", icon: MapPin },
] as const

const DRAFT_KEY = "target_audience_wizard_draft_v1"

const COUNTRY_OPTIONS = [
  "Turkiye",
  "Almanya",
  "Hollanda",
  "Fransa",
  "Ingiltere",
  "ABD",
] as const

const TURKIYE_CITIES = [
  "Adana","Adiyaman","Afyonkarahisar","Agri","Aksaray","Amasya","Ankara","Antalya","Ardahan","Artvin",
  "Aydin","Balikesir","Bartin","Batman","Bayburt","Bilecik","Bingol","Bitlis","Bolu","Burdur","Bursa",
  "Canakkale","Cankiri","Corum","Denizli","Diyarbakir","Duzce","Edirne","Elazig","Erzincan","Erzurum",
  "Eskisehir","Gaziantep","Giresun","Gumushane","Hakkari","Hatay","Igdir","Isparta","Istanbul","Izmir",
  "Kahramanmaras","Karabuk","Karaman","Kars","Kastamonu","Kayseri","Kilis","Kirikkale","Kirklareli",
  "Kirsehir","Kocaeli","Konya","Kutahya","Malatya","Manisa","Mardin","Mersin","Mugla","Mus","Nevsehir",
  "Nigde","Ordu","Osmaniye","Rize","Sakarya","Samsun","Sanliurfa","Siirt","Sinop","Sirnak","Sivas",
  "Tekirdag","Tokat","Trabzon","Tunceli","Usak","Van","Yalova","Yozgat","Zonguldak",
] as const

export default function YeniHedefKitlePage() {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const { companyId } = useCompany()
  const cid = companyId || DEMO_COMPANY_ID
  const today = new Date().toISOString().slice(0, 10)

  const [name, setName] = useState("")
  const [activeStep, setActiveStep] = useState<(typeof FILTER_STEPS)[number]["id"]>("time")
  const [filters, setFilters] = useState<TargetAudienceFilters>(() => ({
    ...defaultTargetAudienceFilters(),
    time: {
      startDate: today,
      endDate: today,
    },
  }))
  const [services, setServices] = useState<NamedItem[]>([])
  const [packages, setPackages] = useState<NamedItem[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [nameError, setNameError] = useState("")
  const [saveInfo, setSaveInfo] = useState("")

  useEffect(() => {
    if (typeof window === "undefined") return
    const p = new URLSearchParams(window.location.search)
    setEditingId(p.get("id"))
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (editingId) return
    try {
      const raw = window.sessionStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as { name?: string; filters?: TargetAudienceFilters }
      if (parsed.name) setName(parsed.name)
      if (parsed.filters) setFilters(safeParseFilters(parsed.filters))
    } catch {
      // ignore broken draft
    }
  }, [editingId])

  useEffect(() => {
    supabase.from("services").select("id,name").eq("company_id", cid).order("name").then(({ data }) => setServices(data || []))
    supabase.from("packages").select("id,name").eq("company_id", cid).order("name").then(({ data }) => setPackages(data || []))
  }, [cid])

  useEffect(() => {
    if (!editingId) return
    let active = true
    ;(async () => {
      setLoading(true)
      const { data } = await supabase
        .from("target_audiences")
        .select("id,name,filters")
        .eq("id", editingId)
        .maybeSingle()
      if (!active) return
      if (data) {
        setName(data.name || "")
        setFilters(safeParseFilters(data.filters))
      }
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [editingId])

  const stepIndex = FILTER_STEPS.findIndex((s) => s.id === activeStep)
  const isLastStep = stepIndex === FILTER_STEPS.length - 1
  const summary = useMemo(() => summarizeFilters(filters), [filters])
  const cityOptions = useMemo(() => {
    if ((filters.location?.country || "") === "Turkiye") return [...TURKIYE_CITIES]
    return []
  }, [filters.location?.country])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (editingId) return
    const payload = JSON.stringify({ name, filters })
    window.sessionStorage.setItem(DRAFT_KEY, payload)
  }, [editingId, filters, name])

  async function saveAudience(status: AudienceStatus = "active", redirectToDetail = true) {
    if (!name.trim()) {
      setNameError("Hedef Kitle Adı zorunludur.")
      return
    }
    setNameError("")
    setSaveInfo("")
    setSaving(true)
    const payload = { company_id: cid, name: name.trim(), filters }

    async function insertWithStatus() {
      const withStatus = await supabase
        .from("target_audiences")
        .insert({ ...payload, status })
        .select("id")
        .single()
      if (!withStatus.error) return withStatus
      if (!String(withStatus.error.message || "").toLowerCase().includes("status")) return withStatus
      return await supabase.from("target_audiences").insert(payload).select("id").single()
    }

    async function updateWithStatus() {
      const withStatus = await supabase.from("target_audiences").update({ ...payload, status }).eq("id", editingId!)
      if (!withStatus.error) return withStatus
      if (!String(withStatus.error.message || "").toLowerCase().includes("status")) return withStatus
      return await supabase.from("target_audiences").update(payload).eq("id", editingId!)
    }

    if (editingId) {
      const { error } = await updateWithStatus()
      setSaving(false)
      if (!error) {
        if (redirectToDetail) {
          router.push(`/pazarlama/hedef-kitleler/${editingId}`)
        } else {
          setSaveInfo(status === "draft" ? "Taslak kaydedildi." : "Kayıt güncellendi.")
        }
      }
      return
    }
    const { data, error } = await insertWithStatus()
    setSaving(false)
    if (!error && data?.id) {
      if (typeof window !== "undefined") window.sessionStorage.removeItem(DRAFT_KEY)
      if (redirectToDetail) {
        router.push(`/pazarlama/hedef-kitleler/${data.id}`)
      } else {
        setSaveInfo(status === "draft" ? "Taslak kaydedildi." : "Kayıt oluşturuldu.")
      }
    }
  }

  function nextStep() {
    if (isLastStep) {
      void saveAudience("active", true)
      return
    }
    const nextIndex = Math.min(FILTER_STEPS.length - 1, stepIndex + 1)
    setActiveStep(FILTER_STEPS[nextIndex]!.id)
  }
  function prevStep() {
    const prevIndex = Math.max(0, stepIndex - 1)
    setActiveStep(FILTER_STEPS[prevIndex]!.id)
  }

  function toggleInArray(key: "serviceIds" | "packageIds", id: string) {
    setFilters((prev) => {
      const old = key === "serviceIds" ? prev.services?.serviceIds || [] : prev.services?.packageIds || []
      const has = old.includes(id)
      const next = has ? old.filter((x) => x !== id) : [...old, id]
      return {
        ...prev,
        services: {
          ...prev.services,
          [key]: next,
        },
      }
    })
  }

  return (
    <div className="p-5 bg-slate-50/60 min-h-full">
      <div className="mb-1 text-xs text-slate-500">
        <button onClick={() => router.push("/pazarlama/hedef-kitleler")} className="hover:text-blue-600">
          Pazarlama / Hedef Kitleler
        </button>{" "}
        / <span className="text-slate-700">{editingId ? "Düzenle" : "Yeni Hedef Kitle"}</span>
      </div>
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-slate-800">{editingId ? "Hedef Kitle Düzenle" : "Yeni Hedef Kitle"}</h1>
      </div>
      <div className="space-y-3">
        <div>
          <Label>Hedef Kitle Adı*</Label>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (nameError) setNameError("")
            }}
            placeholder="Lütfen yazın"
            className={nameError ? "border-red-400 focus-visible:ring-red-500" : undefined}
          />
          {nameError && <p className="text-xs text-red-600 mt-1">{nameError}</p>}
        </div>
        <p className="text-xs text-slate-500">Filtrelerin hiçbiri zorunlu değildir. İhtiyacınıza göre kullanabilirsiniz.</p>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid grid-cols-12 gap-3">
          <aside className="col-span-12 md:col-span-3 space-y-2">
            {FILTER_STEPS.map((step) => {
              const Icon = step.icon
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStep(step.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm flex items-center gap-2 ${
                    activeStep === step.id ? "border-blue-400 bg-blue-50 text-blue-700" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {step.label}
                </button>
              )
            })}
          </aside>

          <section className="col-span-12 md:col-span-9 border-l border-slate-100 pl-3 min-h-[420px]">
            {loading ? (
              <div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
            ) : (
              <>
                <div className="space-y-2 mb-4">
                  {summary.length === 0 ? (
                    <p className="text-sm text-slate-400">Henüz filtre eklemediniz.</p>
                  ) : (
                    summary.map((line) => (
                      <div key={line} className="text-sm rounded-md bg-slate-50 border border-slate-200 px-3 py-2.5">{line}</div>
                    ))
                  )}
                </div>

                {activeStep === "time" && (
                  <div className="grid grid-cols-2 gap-3 max-w-2xl">
                    <div>
                      <Label>Başlangıç</Label>
                      <DateInput
                        value={filters.time?.startDate || ""}
                        onChange={(v) => setFilters((p) => ({ ...p, time: { ...p.time, startDate: v } }))}
                        placeholder="Başlangıç tarihi"
                      />
                    </div>
                    <div>
                      <Label>Bitiş</Label>
                      <DateInput
                        value={filters.time?.endDate || ""}
                        onChange={(v) => setFilters((p) => ({ ...p, time: { ...p.time, endDate: v } }))}
                        placeholder="Bitiş tarihi"
                      />
                    </div>
                  </div>
                )}

                {activeStep === "customer" && (
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(filters.customer?.hasAppointments)} onChange={(e) => setFilters((p) => ({ ...p, customer: { ...p.customer, hasAppointments: e.target.checked } }))} />Randevu alanlar</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(filters.customer?.noAppointments)} onChange={(e) => setFilters((p) => ({ ...p, customer: { ...p.customer, noAppointments: e.target.checked } }))} />Randevu almayanlar</label>
                    <div className="max-w-xs">
                      <Label>Cinsiyet</Label>
                      <select
                        className="w-full h-10 rounded-md border border-slate-200 px-2"
                        value={filters.customer?.gender || ""}
                        onChange={(e) =>
                          setFilters((p) => ({
                            ...p,
                            customer: {
                              ...p.customer,
                              gender: (e.target.value || undefined) as "male" | "female" | "other" | undefined,
                            },
                          }))
                        }
                      >
                        <option value="">Seçim yok</option>
                        <option value="male">Erkek</option>
                        <option value="female">Kadın</option>
                        <option value="other">Belirtmeyen</option>
                      </select>
                    </div>
                  </div>
                )}

                {activeStep === "services" && (
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label>Hizmet</Label>
                      <div className="mt-2 space-y-1 max-h-48 overflow-auto border rounded-md p-2">
                        {services.map((s) => (
                          <label key={s.id} className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={(filters.services?.serviceIds || []).includes(s.id)} onChange={() => toggleInArray("serviceIds", s.id)} />
                            {s.name}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>Paket</Label>
                      <div className="mt-2 space-y-1 max-h-48 overflow-auto border rounded-md p-2">
                        {packages.map((s) => (
                          <label key={s.id} className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={(filters.services?.packageIds || []).includes(s.id)} onChange={() => toggleInArray("packageIds", s.id)} />
                            {s.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeStep === "visit" && (
                  <div className="grid grid-cols-2 gap-3 max-w-2xl">
                    <div><Label>En az</Label><Input type="number" value={filters.visitFrequency?.min ?? ""} onChange={(e) => setFilters((p) => ({ ...p, visitFrequency: { ...p.visitFrequency, min: e.target.value ? Number(e.target.value) : undefined } }))} /></div>
                    <div><Label>En çok</Label><Input type="number" value={filters.visitFrequency?.max ?? ""} onChange={(e) => setFilters((p) => ({ ...p, visitFrequency: { ...p.visitFrequency, max: e.target.value ? Number(e.target.value) : undefined } }))} /></div>
                  </div>
                )}

                {activeStep === "purchase" && (
                  <div className="space-y-3 max-w-3xl">
                    <div className="flex flex-wrap gap-4 text-sm">
                      {[
                        { id: "eq", label: "Eşit" },
                        { id: "gt", label: "Daha fazla" },
                        { id: "lt", label: "Daha az" },
                        { id: "between", label: "Aralığında" },
                      ].map((op) => (
                        <label key={op.id} className="flex items-center gap-1.5">
                          <input type="radio" checked={(filters.purchaseAmount?.operator || "eq") === op.id} onChange={() => setFilters((p) => ({ ...p, purchaseAmount: { ...p.purchaseAmount, operator: op.id as "eq" | "gt" | "lt" | "between" } }))} />
                          {op.label}
                        </label>
                      ))}
                    </div>
                    {(filters.purchaseAmount?.operator || "eq") !== "between" ? (
                      <div className="max-w-xs"><Label>Tutar</Label><Input type="number" value={filters.purchaseAmount?.value ?? ""} onChange={(e) => setFilters((p) => ({ ...p, purchaseAmount: { ...p.purchaseAmount, value: e.target.value ? Number(e.target.value) : undefined } }))} /></div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 max-w-xl">
                        <div><Label>Min</Label><Input type="number" value={filters.purchaseAmount?.min ?? ""} onChange={(e) => setFilters((p) => ({ ...p, purchaseAmount: { ...p.purchaseAmount, min: e.target.value ? Number(e.target.value) : undefined } }))} /></div>
                        <div><Label>Max</Label><Input type="number" value={filters.purchaseAmount?.max ?? ""} onChange={(e) => setFilters((p) => ({ ...p, purchaseAmount: { ...p.purchaseAmount, max: e.target.value ? Number(e.target.value) : undefined } }))} /></div>
                      </div>
                    )}
                  </div>
                )}

                {activeStep === "location" && (
                  <div className="grid grid-cols-2 gap-3 max-w-2xl">
                    <div>
                      <Label>Ülke</Label>
                      <select
                        className="w-full h-10 rounded-md border border-slate-200 px-2"
                        value={filters.location?.country || ""}
                        onChange={(e) =>
                          setFilters((p) => ({
                            ...p,
                            location: { country: e.target.value, city: "" },
                          }))
                        }
                      >
                        <option value="">Seçiniz</option>
                        {COUNTRY_OPTIONS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Şehir</Label>
                      <select
                        className="w-full h-10 rounded-md border border-slate-200 px-2 disabled:bg-slate-50"
                        value={filters.location?.city || ""}
                        disabled={(filters.location?.country || "") !== "Turkiye"}
                        onChange={(e) =>
                          setFilters((p) => ({
                            ...p,
                            location: { ...p.location, city: e.target.value },
                          }))
                        }
                      >
                        <option value="">
                          {(filters.location?.country || "") === "Turkiye" ? "Şehir seçiniz" : "Önce ülke seçiniz"}
                        </option>
                        {cityOptions.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="mt-8 flex items-center justify-between">
              <Button type="button" variant="outline" onClick={prevStep} disabled={stepIndex === 0}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Önceki
              </Button>
              <Button type="button" variant="outline" onClick={nextStep} disabled={saving}>
                {isLastStep ? (
                  <>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Oluştur
                  </>
                ) : (
                  <>
                    Sonraki
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </section>
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2 border-t border-slate-200 pt-4">
        {saveInfo && <p className="mr-auto text-xs text-emerald-700 self-center">{saveInfo}</p>}
        <Button variant="outline" onClick={() => router.push("/pazarlama/hedef-kitleler")}>Vazgeç</Button>
        <Button variant="outline" onClick={() => void saveAudience("draft", false)} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Taslağı Kaydet
        </Button>
        <Button onClick={() => void saveAudience("active", true)} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {editingId ? "Güncelle" : "Oluştur"}
        </Button>
      </div>
    </div>
  )
}
