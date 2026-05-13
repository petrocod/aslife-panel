"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, Loader2, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabaseData } from "@/lib/supabase-data"
import { useCompany, DEMO_COMPANY_ID } from "@/hooks/useCompany"

type Service = { id: string; name: string; price: number; duration_hours: number; duration_minutes: number }

type ServiceLine = {
  service_id: string
  duration_display: string   // e.g. "60 dakika"
  sessions: string
  price: string
}

export default function YeniPaketPage() {
  const router = useRouter()
  const { companyId } = useCompany()
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState("")
  const [services, setServices]   = useState<Service[]>([])

  // Header fields
  const [name, setName]           = useState("")
  const [usagePeriod, setUsagePeriod] = useState("none")
  const [description, setDescription] = useState("")

  // Service lines
  const [lines, setLines] = useState<ServiceLine[]>([
    { service_id: "", duration_display: "", sessions: "0", price: "" },
  ])

  useEffect(() => {
    supabaseData.from("services")
      .select("id,name,price,duration_hours,duration_minutes")
      .order("name")
      .then(({ data }) => setServices(data || []))
  }, [])

  function calcDuration(svc: Service) {
    const total = svc.duration_hours * 60 + svc.duration_minutes
    return total ? `${total} dakika` : "—"
  }

  function handleServiceChange(idx: number, serviceId: string) {
    const svc = services.find((s) => s.id === serviceId)
    setLines((prev) => prev.map((l, i) => i !== idx ? l : {
      ...l,
      service_id: serviceId,
      duration_display: svc ? calcDuration(svc) : "",
      price: svc ? String(svc.price) : "",
    }))
  }

  function updateLine(idx: number, field: keyof ServiceLine, value: string) {
    setLines((prev) => prev.map((l, i) => i !== idx ? l : { ...l, [field]: value }))
  }

  function addLine() {
    setLines((prev) => [...prev, { service_id: "", duration_display: "", sessions: "0", price: "" }])
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx))
  }

  // Auto-calc total
  const totalPrice = lines.reduce((sum, l) => {
    const sessions = Number(l.sessions) || 0
    const price    = Number(l.price) || 0
    return sum + sessions * price
  }, 0)

  async function handleSave() {
    if (!name.trim()) { setError("Paket adı zorunludur."); return }
    setError(""); setLoading(true)

    const { data: pkg, error: pkgErr } = await supabaseData.from("packages").insert({
      company_id:   companyId || DEMO_COMPANY_ID,
      name:         name.trim(),
      description:  description.trim() || null,
      usage_period: usagePeriod,
      price:        totalPrice,
    }).select("id").single()

    if (pkgErr || !pkg) { setError(pkgErr?.message || "Hata oluştu."); setLoading(false); return }

    const serviceInserts = lines
      .filter((l) => l.service_id)
      .map((l) => {
        const svc = services.find((s) => s.id === l.service_id)
        return {
          package_id:       pkg.id,
          service_id:       l.service_id,
          sessions:         Number(l.sessions) || 1,
          price:            l.price ? Number(l.price) : null,
          duration_hours:   svc?.duration_hours ?? 1,
          duration_minutes: svc?.duration_minutes ?? 0,
        }
      })

    if (serviceInserts.length > 0) {
      const { error: linesErr } = await supabaseData.from("package_services").insert(serviceInserts)
      if (linesErr) { setError(linesErr.message); setLoading(false); return }
    }

    router.push("/hizmetler/paketler")
    router.refresh()
  }

  return (
    <div className="flex flex-col min-h-full bg-slate-50">
      <div className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-0">

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
        )}

        {/* ── Row: Paket adı ── */}
        <div className="flex items-center gap-6 bg-white border border-slate-200 rounded-t-xl px-6 py-4 border-b-0">
          <Label className="w-36 text-sm text-slate-600 shrink-0 flex items-center gap-1">
            <span className="text-slate-400">📦</span> Paket adı *
          </Label>
          <Input
            className="flex-1"
            placeholder="Paket adı girin"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* ── Row: Kullanım süresi ── */}
        <div className="flex items-center gap-6 bg-white border border-slate-200 px-6 py-4 border-b-0">
          <Label className="w-36 text-sm text-slate-600 shrink-0 flex items-center gap-1">
            <span className="text-slate-400">📅</span> Kullanım süresi
          </Label>
          <div className="flex-1">
            <Select value={usagePeriod} onValueChange={setUsagePeriod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Kullanım süresi yok</SelectItem>
                <SelectItem value="1_month">1 Ay</SelectItem>
                <SelectItem value="3_months">3 Ay</SelectItem>
                <SelectItem value="6_months">6 Ay</SelectItem>
                <SelectItem value="1_year">1 Yıl</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-400 mt-1">
              Paketin müşteri tarafından ne kadar süre içerisinde kullanması gerektiğini seçiniz.
            </p>
          </div>
        </div>

        {/* ── Row: Açıklama ── */}
        <div className="flex items-start gap-6 bg-white border border-slate-200 px-6 py-4 border-b-0">
          <Label className="w-36 text-sm text-slate-600 shrink-0 flex items-center gap-1 pt-2">
            <span className="text-slate-400">📝</span> Paket açıklaması
          </Label>
          <div className="flex-1">
            <Textarea
              placeholder="Paket açıklaması girin"
              maxLength={300}
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <p className="text-xs text-slate-400 text-right mt-1">{description.length}/300</p>
          </div>
        </div>

        {/* ── Services table ── */}
        <div className="bg-white border border-slate-200 px-6 py-4 border-b-0">
          {/* Header row */}
          <div className="grid grid-cols-[2fr_1.5fr_1fr_1.5fr_auto] gap-3 mb-2">
            <span className="text-xs font-semibold text-slate-500">Hizmet adı</span>
            <span className="text-xs font-semibold text-slate-500">Ort. hizmet süresi</span>
            <span className="text-xs font-semibold text-slate-500">Seans</span>
            <span className="text-xs font-semibold text-slate-500">Hizmet Ücreti (KDV Dahil)</span>
            <span />
          </div>

          {/* Lines */}
          <div className="space-y-2">
            {lines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-[2fr_1.5fr_1fr_1.5fr_auto] gap-3 items-center">
                {/* Service select */}
                <Select value={line.service_id} onValueChange={(v) => handleServiceChange(idx, v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Hizmet seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.length === 0 && (
                      <SelectItem value="_" disabled>Henüz hizmet yok</SelectItem>
                    )}
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Duration (read-only, filled from service) */}
                <Input
                  placeholder="0 dakika"
                  value={line.duration_display}
                  onChange={(e) => updateLine(idx, "duration_display", e.target.value)}
                />

                {/* Sessions */}
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={line.sessions}
                  onChange={(e) => updateLine(idx, "sessions", e.target.value)}
                />

                {/* Price */}
                <div className="flex items-center border border-slate-200 rounded-md px-2 h-9 bg-white">
                  <span className="text-slate-400 mr-1 text-sm">₺</span>
                  <input
                    className="flex-1 text-sm outline-none"
                    placeholder="Hizmet Ücreti (KDV Dahil)"
                    type="number"
                    min="0"
                    value={line.price}
                    onChange={(e) => updateLine(idx, "price", e.target.value)}
                  />
                </div>

                {/* Remove */}
                {lines.length > 1 ? (
                  <button
                    onClick={() => removeLine(idx)}
                    className="text-red-400 hover:text-red-600 p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : <div className="w-6" />}
              </div>
            ))}
          </div>

          {/* Add line */}
          <button
            onClick={addLine}
            className="mt-4 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium border border-dashed border-blue-300 rounded-lg px-4 py-2 w-full justify-center hover:bg-blue-50 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Pakete yeni hizmet ekle
          </button>
        </div>

        {/* ── Total price row ── */}
        <div className="flex items-center justify-end gap-3 bg-white border border-slate-200 rounded-b-xl px-6 py-4">
          <span className="text-sm font-medium text-slate-700">Paket Ücreti:</span>
          <div className="flex items-center border border-slate-200 rounded-md px-3 h-9 min-w-[140px] bg-slate-50">
            <span className="text-slate-400 mr-1.5 text-sm">₺</span>
            <span className="text-sm font-semibold text-slate-800">{totalPrice.toFixed(2)}</span>
          </div>
          <Info className="h-4 w-4 text-slate-400" />
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.back()} disabled={loading}>Vazgeç</Button>
        <Button onClick={handleSave} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Kaydet
        </Button>
      </div>
    </div>
  )
}
