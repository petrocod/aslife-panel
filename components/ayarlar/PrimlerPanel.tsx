"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Filter, Loader2, MoreVertical, Percent, Plus, Search } from "lucide-react"
import { supabaseData as supabase } from "@/lib/supabase-data"
import { useCompany, DEMO_COMPANY_ID } from "@/hooks/useCompany"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type CommissionRule = {
  id: string
  name: string
  employee_id: string | null
  service_id: string | null
  scope: string
  rate: string | number
  is_active: boolean
  employees: { full_name: string } | null
  services: { name: string } | null
}

type Emp = { id: string; full_name: string }
type Svc = { id: string; name: string }

function kapsamLabel(scope: string) {
  if (scope === "employee") return "Çalışan"
  if (scope === "both") return "Çalışan + Hizmet"
  return "Hizmet"
}

function isMissingTableError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false
  const o = err as { code?: string; message?: string }
  return (
    o.code === "PGRST205" ||
    Boolean(o.message?.includes("Could not find the table") || o.message?.includes("schema cache"))
  )
}

export function PrimlerPanel() {
  const { companyId } = useCompany()
  const cid = companyId || DEMO_COMPANY_ID

  const [rules, setRules] = useState<CommissionRule[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [dbTableMissing, setDbTableMissing] = useState(false)

  const [name, setName] = useState("")
  const [applyEmployee, setApplyEmployee] = useState(false)
  const [applyService, setApplyService] = useState(true)
  const [employeeId, setEmployeeId] = useState<string>("")
  const [serviceId, setServiceId] = useState<string>("")
  const [ratePct, setRatePct] = useState("")
  const [isActive, setIsActive] = useState(true)

  const [employees, setEmployees] = useState<Emp[]>([])
  const [services, setServices] = useState<Svc[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("commission_rules")
      .select("id, name, employee_id, service_id, scope, rate, is_active, employees(full_name), services(name)")
      .eq("company_id", cid)
      .order("created_at", { ascending: false })
    if (error) {
      console.error(error)
      setRules([])
      setDbTableMissing(isMissingTableError(error))
    } else {
      setRules((data as unknown as CommissionRule[]) || [])
      setDbTableMissing(false)
    }
    setLoading(false)
  }, [cid])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!sheetOpen) return
    ;(async () => {
      const [e, s] = await Promise.all([
        supabase.from("employees").select("id, full_name").eq("company_id", cid).eq("status", "active").order("full_name"),
        supabase.from("services").select("id, name").eq("company_id", cid).order("name"),
      ])
      setEmployees((e.data as Emp[]) || [])
      setServices((s.data as Svc[]) || [])
    })()
  }, [sheetOpen, cid])

  function fillFormFromRule(r: CommissionRule) {
    setName(r.name)
    setApplyEmployee(r.scope === "both" || r.scope === "employee")
    setApplyService(r.scope === "both" || r.scope === "service")
    setEmployeeId(r.employee_id || "")
    setServiceId(r.service_id || "")
    {
      const n = Number(r.rate)
      setRatePct(Number.isFinite(n) && !Number.isNaN(n) ? String(n).replace(".", ",") : String(r.rate))
    }
    setIsActive(Boolean(r.is_active))
  }

  function openEditSheet(r: CommissionRule) {
    setFormError(null)
    setEditingRuleId(r.id)
    fillFormFromRule(r)
    setSheetOpen(true)
  }

  async function handleDeleteRule(id: string) {
    if (!window.confirm("Bu prim kuralını silmek istiyor musunuz?")) return
    const { error } = await supabase.from("commission_rules").delete().eq("id", id)
    if (error) {
      console.error(error)
      return
    }
    await load()
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rules
    return rules.filter((r) => {
      const en = r.employees?.full_name || ""
      const sn = r.services?.name || ""
      return (
        r.name.toLowerCase().includes(q) ||
        en.toLowerCase().includes(q) ||
        sn.toLowerCase().includes(q) ||
        kapsamLabel(r.scope).toLowerCase().includes(q)
      )
    })
  }, [rules, search])

  function openSheet() {
    setFormError(null)
    setEditingRuleId(null)
    setName("")
    setApplyEmployee(false)
    setApplyService(true)
    setEmployeeId("")
    setServiceId("")
    setRatePct("")
    setIsActive(true)
    setSheetOpen(true)
  }

  function employeeCell(r: CommissionRule) {
    if (r.employees?.full_name) return r.employees.full_name
    if (!r.employee_id) return "Hepsi"
    return "—"
  }

  function serviceCell(r: CommissionRule) {
    if (r.services?.name) return r.services.name
    if (!r.service_id) return "Hepsi"
    return "—"
  }

  async function handleSave() {
    setFormError(null)
    if (!name.trim()) {
      setFormError("Kural adı gerekli.")
      return
    }
    if (!applyEmployee && !applyService) {
      setFormError("En az bir alan seçin: Çalışan veya Hizmet.")
      return
    }
    const rateNum = parseFloat(String(ratePct).replace(",", "."))
    if (Number.isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
      setFormError("Prim yüzdesi 0–100 arasında olmalıdır.")
      return
    }
    let scope: string
    let emp: string | null = null
    let svc: string | null = null
    if (applyEmployee && applyService) {
      if (!employeeId) {
        setFormError("Çalışan seçin.")
        return
      }
      if (!serviceId) {
        setFormError("Hizmet seçin.")
        return
      }
      scope = "both"
      emp = employeeId
      svc = serviceId
    } else if (applyService) {
      if (!serviceId) {
        setFormError("Hizmet seçin.")
        return
      }
      scope = "service"
      emp = null
      svc = serviceId
    } else {
      if (!employeeId) {
        setFormError("Çalışan seçin.")
        return
      }
      scope = "employee"
      emp = employeeId
      svc = null
    }

    setSaving(true)
    try {
      if (editingRuleId) {
        const { error } = await supabase
          .from("commission_rules")
          .update({
            name: name.trim(),
            employee_id: emp,
            service_id: svc,
            scope,
            rate: rateNum,
            is_active: isActive,
          })
          .eq("id", editingRuleId)
        if (error) throw error
      } else {
        const { error } = await supabase.from("commission_rules").insert({
          company_id: cid,
          name: name.trim(),
          employee_id: emp,
          service_id: svc,
          scope,
          rate: rateNum,
          is_active: isActive,
        })
        if (error) throw error
      }
      setSheetOpen(false)
      setEditingRuleId(null)
      await load()
    } catch (e) {
      console.error(e)
      if (isMissingTableError(e)) {
        setDbTableMissing(true)
        setFormError(
          "Veritabanında `commission_rules` tablosu yok. Supabase → SQL Editor’da proje dosyası `supabase/ensure_commission_rules.sql` (tamamı) çalıştırın, sonra sayfayı yenileyin."
        )
      } else {
        const msg =
          e && typeof e === "object" && "message" in e && typeof (e as { message: string }).message === "string"
            ? (e as { message: string }).message
            : "Kayıt başarısız."
        setFormError(msg)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {dbTableMissing && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          <p className="font-semibold">Prim tablosu eksik (PGRST205)</p>
          <p className="mt-1 text-amber-900/90">
            Supabase SQL Editor’da <code className="rounded bg-amber-100/80 px-1">supabase/ensure_commission_rules.sql</code>{" "}
            dosyasını <strong>baştan sona</strong> çalıştırın. Birkaç saniye bekleyin ve sayfayı yenileyin.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex flex-1 flex-wrap items-center gap-2 max-w-2xl">
          <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" title="Filtre (yakında)">
            <Filter className="h-4 w-4" />
          </Button>
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Çalışan Ara"
              className="pl-9 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          className="shrink-0 gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
          onClick={openSheet}
        >
          <Plus className="h-4 w-4" />
          Kural Ekle +
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="text-left pl-4 pr-3 py-3 text-xs font-semibold text-slate-500">Kural Adı</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500">Çalışan</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500">Hizmet</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500">Kapsam</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500">Prim oranı</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500">Durum</th>
                  <th className="w-12 pr-2 py-3 text-center text-xs font-semibold text-slate-500" aria-label="İşlemler" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-sm text-slate-500">
                      {search ? "Arama sonucu yok." : "Henüz prim kuralı eklenmemiş."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                      <td className="pl-4 pr-3 py-3 text-sm font-medium text-slate-800">{r.name}</td>
                      <td className="px-3 py-3 text-sm text-slate-700">{employeeCell(r)}</td>
                      <td className="px-3 py-3 text-sm text-slate-700">{serviceCell(r)}</td>
                      <td className="px-3 py-3 text-sm text-slate-600">{kapsamLabel(r.scope)}</td>
                      <td className="px-3 py-3 text-sm text-slate-800 text-right tabular-nums font-medium">
                        %{Number(r.rate).toLocaleString("tr-TR", { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-3">
                        {r.is_active ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-0 hover:bg-emerald-100 font-medium">
                            Aktif
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="font-medium text-slate-600">
                            Pasif
                          </Badge>
                        )}
                      </td>
                      <td className="pr-2 py-2 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-500"
                              aria-label="İşlemler"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40 z-[200]">
                            <DropdownMenuItem
                              onClick={() => {
                                openEditSheet(r)
                              }}
                            >
                              Düzenle
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600"
                              onClick={() => void handleDeleteRule(r.id)}
                            >
                              Sil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
          Toplam kayıt: {filtered.length} adet
        </div>
      </div>

      <Sheet
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o)
          if (!o) {
            setFormError(null)
            setEditingRuleId(null)
          }
        }}
      >
        <SheetContent className="flex w-full max-w-md flex-col p-0" side="right">
          <SheetHeader className="text-left border-b border-slate-100 px-6 pb-4 pt-6">
            <SheetTitle className="text-lg">
              {editingRuleId ? "Prim Kuralını Düzenle" : "Prim Kuralı Ekle"}
            </SheetTitle>
            <p className="text-sm text-slate-500 font-normal leading-snug pr-1">
              Belirli bir hizmet veya çalışan için geçerli olacak oranı tanımlayın.
            </p>
          </SheetHeader>
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <div className="space-y-1.5">
              <Label htmlFor="pr-name" className="text-slate-700">
                Kural Adı
              </Label>
              <Input
                id="pr-name"
                placeholder="Kural adı giriniz"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Kural hangi alanlarda uygulanacak?</span>
              <div className="flex flex-col gap-2.5 pl-0.5">
                <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-800">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    checked={applyEmployee}
                    onChange={(e) => setApplyEmployee(e.target.checked)}
                  />
                  Çalışan
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-800">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    checked={applyService}
                    onChange={(e) => setApplyService(e.target.checked)}
                  />
                  Hizmet
                </label>
              </div>
            </div>

            {applyEmployee && (
              <div className="space-y-1.5">
                <Label>Çalışan</Label>
                <Select value={employeeId || undefined} onValueChange={setEmployeeId}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Çalışan seçin" />
                  </SelectTrigger>
                  <SelectContent className="z-[200] max-h-56">
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {applyService && (
              <div className="space-y-1.5">
                <Label>Hizmet</Label>
                <Select value={serviceId || undefined} onValueChange={setServiceId}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Hizmet seçin" />
                  </SelectTrigger>
                  <SelectContent className="z-[200] max-h-56">
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="pr-rate">Prim Yüzdesi</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Percent className="h-4 w-4" />
                </span>
                <Input
                  id="pr-rate"
                  type="text"
                  inputMode="decimal"
                  placeholder="Komisyon yüzdesi giriniz"
                  value={ratePct}
                  onChange={(e) => setRatePct(e.target.value)}
                  className="h-10 pl-9"
                />
              </div>
            </div>
          </div>

          <SheetFooter className="border-t border-slate-100 bg-slate-50/50 flex-col items-stretch gap-3 sm:flex-col px-6 py-4">
            {formError && (
              <p className="text-sm text-red-600 rounded-md border border-red-200 bg-red-50 px-3 py-2" role="alert">
                {formError}
              </p>
            )}
            <div className="flex items-center justify-between gap-4 w-full">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Aktif</span>
                <Switch checked={isActive} onCheckedChange={setIsActive} className="data-[state=checked]:bg-emerald-500" />
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={() => setSheetOpen(false)} className="text-slate-600">
                  Vazgeç
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingRuleId ? "Güncelle" : "Kaydet"}
                </Button>
              </div>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
