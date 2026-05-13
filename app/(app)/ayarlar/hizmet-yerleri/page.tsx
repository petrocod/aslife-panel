"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Plus, Search, Pencil, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { supabaseData as supabase } from "@/lib/supabase-data"
import { useCompany, DEMO_COMPANY_ID } from "@/hooks/useCompany"

type Location = {
  id: string
  name: string
  description: string | null
  responsible_employee_id?: string | null
}
type Employee = { id: string; full_name: string }

export default function HizmetYerleriPage() {
  const { companyId, loading: companyLoading } = useCompany()
  const cid = useMemo(() => companyId || DEMO_COMPANY_ID, [companyId])
  const [locations, setLocations] = useState<Location[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showDialog, setShowDialog] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [pageInfo, setPageInfo] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [assignedEmployee, setAssignedEmployee] = useState("")

  const fetchData = useCallback(async () => {
    if (companyLoading) return
    setLoading(true)
    const [{ data: locs, error: locErr }, { data: emps, error: empErr }] = await Promise.all([
      supabase
        .from("service_locations")
        .select("id, name, description, responsible_employee_id")
        .eq("company_id", cid)
        .order("name"),
      supabase
        .from("employees")
        .select("id, full_name")
        .eq("company_id", cid)
        .eq("status", "active")
        .order("full_name"),
    ])
    if (locErr) {
      console.error(locErr)
      if ((locErr as { code?: string }).code === "PGRST204" || (locErr as { message?: string }).message?.includes("responsible_employee_id")) {
        const { data: locs2 } = await supabase
          .from("service_locations")
          .select("id, name, description")
          .eq("company_id", cid)
          .order("name")
        setLocations((locs2 as Location[]) || [])
      } else {
        setLocations([])
      }
    } else {
      setLocations((locs as Location[]) || [])
    }
    if (empErr) {
      console.error(empErr)
      setEmployees([])
    } else {
      setEmployees((emps as Employee[]) || [])
    }
    setLoading(false)
  }, [cid, companyLoading])

  useEffect(() => {
    if (!companyLoading) void fetchData()
  }, [fetchData, companyLoading])

  function openNew() {
    setEditId(null)
    setName("")
    setDescription("")
    setAssignedEmployee("")
    setError("")
    setPageInfo(null)
    setShowDialog(true)
  }

  function openEdit(loc: Location) {
    setEditId(loc.id)
    setName(loc.name)
    setDescription(loc.description || "")
    setAssignedEmployee(loc.responsible_employee_id ?? "")
    setError("")
    setPageInfo(null)
    setShowDialog(true)
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("Hizmet yeri adı zorunludur.")
      return
    }
    setError("")
    setSaving(true)

    const basePayload = {
      company_id: cid,
      name: name.trim(),
      description: description.trim() || null,
    }
    const fullPayload = {
      ...basePayload,
      responsible_employee_id: assignedEmployee ? assignedEmployee : null,
    }

    const doSave = (p: { company_id: string; name: string; description: string | null; responsible_employee_id?: string | null }) =>
      editId
        ? supabase.from("service_locations").update(p).eq("id", editId)
        : supabase.from("service_locations").insert(p)

    let { error } = await doSave(fullPayload)
    const colMissing =
      error &&
      (error.message?.includes("responsible_employee_id") ||
        (error.message?.toLowerCase().includes("column") && error.message?.includes("does not exist")))
    if (error && colMissing) {
      const { error: e2 } = await doSave(basePayload)
      error = e2
      if (!e2) {
        setPageInfo(
          "Hizmet yeri kaydedildi. Sorumlu alanını kaydetmek için (isteğe bağlı) `supabase/ensure_service_location_responsible.sql` dosyasını Supabase SQL Editor’da bir kez çalıştırın."
        )
        setSaving(false)
        setShowDialog(false)
        void fetchData()
        return
      }
    }

    if (error) {
      console.error(error)
      setError(error.message || "Kayıt başarısız. company_id / şemayı kontrol edin.")
      setSaving(false)
      return
    }

    setSaving(false)
    setShowDialog(false)
    await fetchData()
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu hizmet yerini silmek istediğinizden emin misiniz?")) return
    const { error } = await supabase.from("service_locations").delete().eq("id", id).eq("company_id", cid)
    if (error) {
      console.error(error)
      return
    }
    void fetchData()
  }

  const q = search.trim().toLowerCase()
  const filtered = locations.filter(
    (l) =>
      l.name.toLowerCase().includes(q) ||
      (l.description && l.description.toLowerCase().includes(q))
  )

  if (companyLoading) {
    return (
      <div className="p-6 flex justify-center min-h-[240px] items-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="p-6">
      {pageInfo && (
        <div
          role="status"
          className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950"
        >
          {pageInfo}
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Hizmet yeri ara" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button className="gap-1" onClick={openNew}>
          <Plus className="h-4 w-4" />
          Hizmet yeri oluştur
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Hizmet yeri adı</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Açıklama</th>
              <th className="px-6 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={3} className="py-12 text-center text-sm text-slate-500">
                {search ? "Sonuç bulunamadı." : "Henüz hizmet yeri eklenmemiş."}
              </td></tr>
            ) : (
              filtered.map((loc) => (
                <tr key={loc.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-medium text-slate-800">{loc.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{loc.description || "-"}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(loc)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => handleDelete(loc.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="px-6 py-3 border-t border-slate-100 text-xs text-slate-500">
          Toplam kayıt: {filtered.length} adet
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Hizmet yeri düzenle" : "Yeni hizmet yeri oluştur"}</DialogTitle>
          </DialogHeader>

          {error && <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">{error}</div>}

          <div className="space-y-4">
            <div>
              <Label>Hizmet yerinin adı *</Label>
              <Input placeholder="Oda 1, Sınıf 1, Salon..." className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Sorumlu kişi</Label>
              <Select
                value={assignedEmployee || undefined}
                onValueChange={(v) => setAssignedEmployee(v || "")}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Çalışan seçin (opsiyonel)" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Açıklama</Label>
              <Textarea placeholder="Açıklama yazın" className="mt-1.5" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>Vazgeç</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Kaydet
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
