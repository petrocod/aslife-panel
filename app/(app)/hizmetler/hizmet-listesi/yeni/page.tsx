"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabaseData } from "@/lib/supabase-data"
import { useCompany, DEMO_COMPANY_ID } from "@/hooks/useCompany"
import { Loader2 } from "lucide-react"

type Location = { id: string; name: string }
type Employee = { id: string; full_name: string }

export default function YeniHizmetPage() {
  const router = useRouter()
  const { companyId } = useCompany()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
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
      const [{ data: locs }, { data: emps }] = await Promise.all([
        supabaseData.from("service_locations").select("id, name").order("name"),
        supabaseData.from("employees").select("id, full_name").eq("status", "active").order("full_name"),
      ])
      setLocations(locs || [])
      setEmployees(emps || [])
    }
    load()
  }, [])

  async function handleSave() {
    if (!name.trim()) { setError("Hizmet adı zorunludur."); return }
    if (!price || isNaN(Number(price))) { setError("Geçerli bir ücret girin."); return }
    setError("")
    setLoading(true)

    const { error: sbError } = await supabaseData.from("services").insert({
      company_id: companyId || DEMO_COMPANY_ID,
      name: name.trim(),
      duration_hours: Number(durationHours),
      duration_minutes: Number(durationMinutes),
      vat_rate: Number(vatRate),
      price: Number(price),
      location_id: locationId || null,
      employee_id: employeeId || null,
    })

    setLoading(false)
    if (sbError) { setError(sbError.message); return }
    router.push("/hizmetler/hizmet-listesi")
    router.refresh()
  }

  return (
    <div className="p-6 max-w-2xl">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
      )}

      <div className="space-y-5">
        <div>
          <Label className="text-sm text-slate-600">Hizmet adı *</Label>
          <Input
            placeholder="Fizik Tedavi, Pilates, Masaj..."
            className="mt-1.5"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <Label className="text-sm text-slate-600">Ort. hizmet süresi *</Label>
          <div className="flex gap-2 mt-1.5">
            <Select value={durationHours} onValueChange={setDurationHours}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0,1,2,3,4,5,6,7,8].map((h) => (
                  <SelectItem key={h} value={String(h)}>{h} Saat</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={durationMinutes} onValueChange={setDurationMinutes}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0,15,30,45].map((m) => (
                  <SelectItem key={m} value={String(m)}>{m} Dakika</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-sm text-slate-600">KDV oranı *</Label>
          <Select value={vatRate} onValueChange={setVatRate}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">%0</SelectItem>
              <SelectItem value="1">%1</SelectItem>
              <SelectItem value="10">%10</SelectItem>
              <SelectItem value="20">%20</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm text-slate-600">Hizmet ücreti (KDV dahil) *</Label>
          <Input
            placeholder="Hizmet ücreti (KDV dahil)"
            className="mt-1.5"
            type="number"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>

        <div>
          <Label className="text-sm text-slate-600">Hizmet yeri</Label>
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Hizmet yeri seçin" />
            </SelectTrigger>
            <SelectContent>
              {locations.length === 0 && (
                <SelectItem value="none" disabled>Henüz hizmet yeri yok</SelectItem>
              )}
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-400 mt-1">Yeni bir hizmet yeri oluşturmak için Ayarlar &gt; Hizmet yeri</p>
        </div>

        <div>
          <Label className="text-sm text-slate-600">Hizmete atanan çalışan</Label>
          <Select value={employeeId} onValueChange={setEmployeeId}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Çalışan seçin" />
            </SelectTrigger>
            <SelectContent>
              {employees.length === 0 && (
                <SelectItem value="none" disabled>Henüz çalışan yok</SelectItem>
              )}
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-400 mt-1">Yeni bir çalışan oluşturmak için Ayarlar &gt; Çalışanlar</p>
        </div>
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
