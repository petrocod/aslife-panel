"use client"

import { useState, useEffect, useCallback } from "react"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DateInput } from "@/components/shared/DateInput"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { supabaseData as supabase } from "@/lib/supabase-data"
import {
  Plus,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Ruler,
  Trash2,
} from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

type Measurement = {
  id: string
  measured_at: string
  weight: number | null
  height: number | null
  waist: number | null
  hip: number | null
  chest: number | null
  arm: number | null
  thigh: number | null
  body_fat_pct: number | null
  bmi: number | null
  notes: string | null
  created_at: string
}

const FIELDS: { key: keyof Measurement; label: string; unit: string; color: string }[] = [
  { key: "weight", label: "Kilo", unit: "kg", color: "#2563eb" },
  { key: "waist", label: "Bel", unit: "cm", color: "#dc2626" },
  { key: "hip", label: "Kalça", unit: "cm", color: "#9333ea" },
  { key: "chest", label: "Göğüs", unit: "cm", color: "#16a34a" },
  { key: "arm", label: "Kol", unit: "cm", color: "#ea580c" },
  { key: "thigh", label: "Bacak", unit: "cm", color: "#0891b2" },
  { key: "body_fat_pct", label: "Yağ %", unit: "%", color: "#ca8a04" },
]

function TrendIcon({ current, previous }: { current: number | null; previous: number | null }) {
  if (current == null || previous == null) return <Minus className="w-3 h-3 text-slate-400" />
  if (current < previous) return <TrendingDown className="w-3 h-3 text-green-600" />
  if (current > previous) return <TrendingUp className="w-3 h-3 text-red-500" />
  return <Minus className="w-3 h-3 text-slate-400" />
}

export function MeasurementsTab({
  customerId,
  companyId,
}: {
  customerId: string
  companyId: string | null
}) {
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [chartMetric, setChartMetric] = useState<string>("weight")

  // Form state
  const [measuredAt, setMeasuredAt] = useState(format(new Date(), "yyyy-MM-dd"))
  const [weight, setWeight] = useState("")
  const [height, setHeight] = useState("")
  const [waist, setWaist] = useState("")
  const [hip, setHip] = useState("")
  const [chest, setChest] = useState("")
  const [arm, setArm] = useState("")
  const [thigh, setThigh] = useState("")
  const [bodyFat, setBodyFat] = useState("")
  const [notes, setNotes] = useState("")

  const fetchMeasurements = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    const { data } = await supabase
      .from("customer_measurements")
      .select("*")
      .eq("customer_id", customerId)
      .eq("company_id", companyId)
      .order("measured_at", { ascending: true })
    setMeasurements((data as Measurement[]) || [])
    setLoading(false)
  }, [customerId, companyId])

  useEffect(() => {
    fetchMeasurements()
  }, [fetchMeasurements])

  function resetForm() {
    setMeasuredAt(format(new Date(), "yyyy-MM-dd"))
    setWeight(""); setHeight(""); setWaist(""); setHip("")
    setChest(""); setArm(""); setThigh(""); setBodyFat(""); setNotes("")
  }

  async function handleSave() {
    if (!companyId) return
    setSaving(true)

    const w = parseFloat(weight) || null
    const h = parseFloat(height) || null
    const bmi = w && h ? parseFloat((w / ((h / 100) ** 2)).toFixed(1)) : null

    await supabase.from("customer_measurements").insert({
      customer_id: customerId,
      company_id: companyId,
      measured_at: measuredAt,
      weight: w,
      height: h,
      waist: parseFloat(waist) || null,
      hip: parseFloat(hip) || null,
      chest: parseFloat(chest) || null,
      arm: parseFloat(arm) || null,
      thigh: parseFloat(thigh) || null,
      body_fat_pct: parseFloat(bodyFat) || null,
      bmi,
      notes: notes.trim() || null,
    })

    setSaving(false)
    setShowForm(false)
    resetForm()
    await fetchMeasurements()
  }

  async function handleDelete(mId: string) {
    await supabase.from("customer_measurements").delete().eq("id", mId)
    await fetchMeasurements()
  }

  const latest = measurements.length > 0 ? measurements[measurements.length - 1] : null
  const prev = measurements.length > 1 ? measurements[measurements.length - 2] : null

  const chartData = measurements.map((m) => ({
    date: format(new Date(m.measured_at), "dd MMM", { locale: tr }),
    ...FIELDS.reduce((acc, f) => {
      acc[f.key] = m[f.key] as number | null
      return acc
    }, {} as Record<string, number | null>),
  }))

  const activeChartField = FIELDS.find((f) => f.key === chartMetric) || FIELDS[0]

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Ruler className="w-5 h-5" /> Vücut Ölçümleri
        </h2>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" /> Yeni Ölçüm
        </Button>
      </div>

      {/* Summary Cards */}
      {latest && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {FIELDS.map((f) => {
            const val = latest[f.key] as number | null
            const prevVal = prev ? (prev[f.key] as number | null) : null
            return (
              <div key={f.key} className="bg-white border border-slate-200 rounded-lg p-3 text-center">
                <p className="text-[11px] text-slate-500 mb-1">{f.label}</p>
                <p className="text-lg font-bold text-slate-800">
                  {val != null ? val : "—"}
                  {val != null && <span className="text-xs font-normal text-slate-400 ml-0.5">{f.unit}</span>}
                </p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <TrendIcon current={val} previous={prevVal} />
                  {val != null && prevVal != null && (
                    <span className="text-[10px] text-slate-500">
                      {val > prevVal ? "+" : ""}{(val - prevVal).toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Chart */}
      {measurements.length >= 2 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {FIELDS.map((f) => (
              <button
                key={f.key}
                onClick={() => setChartMetric(f.key)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                  chartMetric === f.key
                    ? "bg-blue-50 border-blue-300 text-blue-700 font-medium"
                    : "border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey={activeChartField.key}
                name={`${activeChartField.label} (${activeChartField.unit})`}
                stroke={activeChartField.color}
                strokeWidth={2}
                dot={{ r: 4 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* History Table */}
      {measurements.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Tarih</th>
                  {FIELDS.map((f) => (
                    <th key={f.key} className="px-3 py-2 text-center text-xs font-medium text-slate-600">
                      {f.label}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-center text-xs font-medium text-slate-600">BMI</th>
                  <th className="px-3 py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {[...measurements].reverse().map((m) => (
                  <tr key={m.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="px-3 py-2 text-xs font-medium text-slate-700 whitespace-nowrap">
                      {format(new Date(m.measured_at), "dd.MM.yyyy")}
                    </td>
                    {FIELDS.map((f) => (
                      <td key={f.key} className="px-3 py-2 text-center text-xs text-slate-600">
                        {(m[f.key] as number | null) != null ? m[f.key] : "—"}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center text-xs text-slate-600">
                      {m.bmi != null ? m.bmi : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Ruler className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Henüz ölçüm kaydı yok.</p>
          <Button size="sm" className="mt-4" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1" /> İlk Ölçümü Ekle
          </Button>
        </div>
      )}

      {/* New Measurement Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Yeni Ölçüm Ekle</h2>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Ölçüm Tarihi</Label>
              <DateInput
                value={measuredAt}
                onChange={(v) => setMeasuredAt(v)}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-slate-600">Kilo (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="72.5"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Boy (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="175"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Bel (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={waist}
                  onChange={(e) => setWaist(e.target.value)}
                  placeholder="82"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Kalça (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={hip}
                  onChange={(e) => setHip(e.target.value)}
                  placeholder="96"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Göğüs (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={chest}
                  onChange={(e) => setChest(e.target.value)}
                  placeholder="98"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Kol (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={arm}
                  onChange={(e) => setArm(e.target.value)}
                  placeholder="32"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Bacak (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={thigh}
                  onChange={(e) => setThigh(e.target.value)}
                  placeholder="55"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Vücut Yağ %</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={bodyFat}
                  onChange={(e) => setBodyFat(e.target.value)}
                  placeholder="22.5"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-600">Notlar</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="mt-1"
                placeholder="Ek bilgi..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>İptal</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Kaydet
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
