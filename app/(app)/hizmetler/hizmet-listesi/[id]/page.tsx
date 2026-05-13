"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { supabaseData as supabase } from "@/lib/supabase-data"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Loader2, Trash2 } from "lucide-react"

type Location = { id: string; name: string }
type Employee = { id: string; full_name: string }

export default function HizmetDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [locations, setLocations] = useState<Location[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])

  const [name, setName] = useState("")
  const [durationHours, setDurationHours] = useState("1")
  const [durationMinutes, setDurationMinutes] = useState("0")
  const [vatRate, setVatRate] = useState("20")
  const [price, setPrice] = useState("")
  const [locationId, setLocationId] = useState("")
  const [employeeId, setEmployeeId] = useState("")

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: svc }, { data: locs }, { data: emps }] = await Promise.all([
        supabase.from("services").select("*").eq("id", id).single(),
        supabase.from("service_locations").select("id, name").order("name"),
        supabase.from("employees").select("id, full_name").eq("status", "active").order("full_name"),
      ])
      if (svc) {
        setName(svc.name || "")
        setDurationHours(String(svc.duration_hours ?? 1))
        setDurationMinutes(String(svc.duration_minutes ?? 0))
        setVatRate(String(svc.vat_rate ?? 20))
        setPrice(String(svc.price ?? ""))
        setLocationId(svc.location_id || "")
        setEmployeeId(svc.employee_id || "")
      }
      setLocations(locs || [])
      setEmployees(emps || [])
      setLoading(false)
    }
    load()
  }, [id])

  async function handleSave() {
    if (!name.trim()) { setError("Hizmet adı zorunludur."); return }
    setError(""); setSaving(true)
    const { error: sbError } = await supabase.from("services").update({
      name: name.trim(),
      duration_hours: Number(durationHours),
      duration_minutes: Number(durationMinutes),
      vat_rate: Number(vatRate),
      price: Number(price),
      location_id: locationId || null,
      employee_id: employeeId || null,
    }).eq("id", id)
    setSaving(false)
    if (sbError) { setError(sbError.message); return }
    setSuccess("Hizmet güncellendi.")
    setTimeout(() => setSuccess(""), 3000)
  }

  async function handleDelete() {
    if (!confirm("Bu hizmeti silmek istediğinizden emin misiniz?")) return
    await supabase.from("services").delete().eq("id", id)
    router.push("/hizmetler/hizmet-listesi")
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
          <h1 className="text-lg font-semibold text-slate-800">{name}</h1>
        </div>
        <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleDelete}>
          <Trash2 className="h-4 w-4 mr-1" /> Sil
        </Button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{success}</div>}

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div>
          <Label>Hizmet adı *</Label>
          <Input className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Ort. hizmet süresi</Label>
          <div className="flex gap-2 mt-1.5">
            <Select value={durationHours} onValueChange={setDurationHours}>
              <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[0,1,2,3,4,5,6,7,8].map((h) => <SelectItem key={h} value={String(h)}>{h} Saat</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={durationMinutes} onValueChange={setDurationMinutes}>
              <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[0,15,30,45].map((m) => <SelectItem key={m} value={String(m)}>{m} Dakika</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>KDV oranı</Label>
            <Select value={vatRate} onValueChange={setVatRate}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">%0</SelectItem>
                <SelectItem value="1">%1</SelectItem>
                <SelectItem value="10">%10</SelectItem>
                <SelectItem value="20">%20</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Hizmet ücreti (₺)</Label>
            <Input type="number" min="0" className="mt-1.5" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Hizmet yeri</Label>
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Seçin" /></SelectTrigger>
            <SelectContent>
              {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Atanan çalışan</Label>
          <Select value={employeeId} onValueChange={setEmployeeId}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Seçin" /></SelectTrigger>
            <SelectContent>
              {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

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
