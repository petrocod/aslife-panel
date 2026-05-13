"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { supabaseData as supabase } from "@/lib/supabase-data"
import { useCompany, DEMO_COMPANY_ID } from "@/hooks/useCompany"

type Field = { id: string; label: string; field_type: string }

export default function DinamikAlanlarPage() {
  const { companyId } = useCompany()
  const [fields, setFields] = useState<Field[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [label, setLabel] = useState("")
  const [fieldType, setFieldType] = useState("text")
  const [error, setError] = useState("")

  const fetchFields = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from("dynamic_fields").select("id, label, field_type").order("created_at", { ascending: false })
    setFields(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchFields() }, [fetchFields])

  async function handleSave() {
    if (!label.trim()) { setError("Alan başlığı zorunludur."); return }
    setError(""); setSaving(true)
    await supabase.from("dynamic_fields").insert({
      company_id: companyId || DEMO_COMPANY_ID,
      label: label.trim(),
      field_type: fieldType,
    })
    setSaving(false)
    setShowNew(false)
    setLabel(""); setFieldType("text")
    fetchFields()
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu alanı silmek istediğinizden emin misiniz?")) return
    await supabase.from("dynamic_fields").delete().eq("id", id)
    fetchFields()
  }

  const filtered = fields.filter((f) => f.label.toLowerCase().includes(search.toLowerCase()))

  const typeLabel = (t: string) => ({ text: "Metin", number: "Sayı", date: "Tarih", select: "Seçim" }[t] || t)

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Alan başlığı ara" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button className="gap-1" onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4" />
          Alan ekle
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Alan Başlığı</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Tür</th>
              <th className="px-6 py-3 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="py-12 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-400" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={3} className="py-12 text-center text-sm text-slate-500">Henüz dinamik alan eklenmemiş.</td></tr>
            ) : (
              filtered.map((f) => (
                <tr key={f.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-6 py-4 text-sm font-medium text-slate-800">{f.label}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{typeLabel(f.field_type)}</td>
                  <td className="px-6 py-4">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(f.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="px-6 py-3 border-t border-slate-100 text-xs text-slate-500">
          Toplam: {filtered.length} alan
        </div>
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>Yeni Dinamik Alan</DialogTitle></DialogHeader>
          {error && <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">{error}</div>}
          <div className="space-y-4">
            <div>
              <Label>Alan başlığı *</Label>
              <Input placeholder="Kan grubu, Doktor adı..." className="mt-1.5" value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div>
              <Label>Alan türü</Label>
              <Select value={fieldType} onValueChange={setFieldType}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Metin</SelectItem>
                  <SelectItem value="number">Sayı</SelectItem>
                  <SelectItem value="date">Tarih</SelectItem>
                  <SelectItem value="select">Seçim listesi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowNew(false)}>Vazgeç</Button>
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
