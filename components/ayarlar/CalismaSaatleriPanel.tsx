"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  addDays,
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  startOfWeek,
} from "date-fns"
import { tr } from "date-fns/locale"
import { Ban, ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react"
import { supabaseData as supabase } from "@/lib/supabase-data"
import { useCompany, DEMO_COMPANY_ID } from "@/hooks/useCompany"
import { Button } from "@/components/ui/button"
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
import { cn } from "@/lib/utils"
import {
  type DayForm,
  type WorkDayRow,
  buildFormFromResolve,
  dateForDowInWeek,
  resolveWorkDay,
} from "@/lib/working-hours-resolve"

type Emp = { id: string; full_name: string; color: string | null }

type LeaveRow = {
  employee_id: string
  start_date: string
  end_date: string
}

const DOW_TR: { dow: number; label: string }[] = [
  { dow: 1, label: "Pazartesi" },
  { dow: 2, label: "Salı" },
  { dow: 3, label: "Çarşamba" },
  { dow: 4, label: "Perşembe" },
  { dow: 5, label: "Cuma" },
  { dow: 6, label: "Cumartesi" },
  { dow: 0, label: "Pazar" },
]

function buildFormFromMap(m: Record<number, WorkDayRow>): Record<number, DayForm> {
  const out: Record<number, DayForm> = {}
  for (let d = 0; d <= 6; d++) {
    const w = m[d]
    out[d] = {
      is_open: Boolean(w?.is_open),
      start_time: w?.start_time ? String(w.start_time).slice(0, 5) : "09:00",
      end_time: w?.end_time ? String(w.end_time).slice(0, 5) : "18:00",
    }
  }
  return out
}

function employeeInitials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (p.length === 0) return "?"
  if (p.length === 1) return p[0]!.slice(0, 3).toUpperCase()
  return p
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 3)
    .toUpperCase()
}

function formatHm(t: string | null) {
  if (!t) return "—"
  return String(t).slice(0, 5)
}

function dateInLeaveRange(d: Date, startStr: string, endStr: string) {
  const x = format(d, "yyyy-MM-dd")
  return x >= startStr && x <= endStr
}

type TekrarMode = "none" | "weekly"

function isMissingTableError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false
  const o = err as { code?: string; message?: string }
  return (
    o.code === "PGRST205" ||
    Boolean(o.message?.includes("Could not find the table") || o.message?.includes("schema cache"))
  )
}

export function CalismaSaatleriPanel() {
  const { companyId } = useCompany()
  const cid = companyId || DEMO_COMPANY_ID

  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [employees, setEmployees] = useState<Emp[]>([])
  const [workByDow, setWorkByDow] = useState<Record<number, WorkDayRow>>({})
  /** per employee, per day_of_week: Haftalık tekrar */
  const [empWhByEid, setEmpWhByEid] = useState<Record<string, Record<number, WorkDayRow>>>({})
  /** `employeeId__yyyy-MM-dd` : görülen hafta için Tekrarlanmaz / günlük override */
  const [dateOvrByKey, setDateOvrByKey] = useState<Record<string, WorkDayRow>>({})
  const [leaves, setLeaves] = useState<LeaveRow[]>([])
  const [loading, setLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedEmpId, setSelectedEmpId] = useState<string>("")
  const [formDays, setFormDays] = useState<Record<number, DayForm>>(() => buildFormFromMap({}))
  const [saving, setSaving] = useState(false)
  const [tekrar, setTekrar] = useState<TekrarMode>("none")
  const [dbTablesMissing, setDbTablesMissing] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const weekDays = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) }),
    [weekStart]
  )

  const rangeLabel = useMemo(() => {
    const a = format(weekStart, "dd/MM/yyyy", { locale: tr })
    const b = format(addDays(weekStart, 6), "dd/MM/yyyy", { locale: tr })
    return `${a} - ${b}`
  }, [weekStart])

  const load = useCallback(async () => {
    setLoading(true)
    const { data: emps, error: e1 } = await supabase
      .from("employees")
      .select("id, full_name, color")
      .eq("company_id", cid)
      .eq("status", "active")
      .order("full_name")

    if (e1) {
      setEmployees([])
    } else {
      setEmployees((emps as Emp[]) || [])
    }

    const { data: wh, error: e2 } = await supabase
      .from("working_hours")
      .select("day_of_week, is_open, start_time, end_time")
      .eq("company_id", cid)

    const map: Record<number, WorkDayRow> = {}
    if (!e2 && wh) {
      for (const row of wh as WorkDayRow[]) {
        const dow = Number((row as { day_of_week: number | string }).day_of_week)
        if (Number.isNaN(dow) || dow < 0 || dow > 6) continue
        map[dow] = {
          day_of_week: dow,
          is_open: Boolean((row as { is_open: boolean }).is_open),
          start_time: row.start_time,
          end_time: row.end_time,
        }
      }
    }
    setWorkByDow(map)

    const empIds = (emps as Emp[] | null)?.map((x) => x.id) || []
    const w0 = format(weekStart, "yyyy-MM-dd")
    const w1 = format(addDays(weekStart, 6), "yyyy-MM-dd")

    const empEwh: Record<string, Record<number, WorkDayRow>> = {}
    const ovr: Record<string, WorkDayRow> = {}
    let missingWhTables = false

    if (empIds.length) {
      const { data: ewhRows, error: eEwh } = await supabase
        .from("employee_working_hours")
        .select("employee_id, day_of_week, is_open, start_time, end_time")
        .eq("company_id", cid)
        .in("employee_id", empIds)

      if (eEwh && isMissingTableError(eEwh)) missingWhTables = true

      if (!eEwh && ewhRows) {
        for (const row of ewhRows as {
          employee_id: string
          day_of_week: number
          is_open: boolean
          start_time: string | null
          end_time: string | null
        }[]) {
          const eid = row.employee_id
          const dow = Number(row.day_of_week)
          if (Number.isNaN(dow) || dow < 0 || dow > 6) continue
          if (!empEwh[eid]) empEwh[eid] = {}
          empEwh[eid]![dow] = {
            day_of_week: dow,
            is_open: Boolean(row.is_open),
            start_time: row.start_time,
            end_time: row.end_time,
          }
        }
      }

      const { data: byDateRows, error: eBd } = await supabase
        .from("employee_working_by_date")
        .select("employee_id, work_date, is_open, start_time, end_time")
        .eq("company_id", cid)
        .in("employee_id", empIds)
        .gte("work_date", w0)
        .lte("work_date", w1)

      if (eBd && isMissingTableError(eBd)) missingWhTables = true

      if (!eBd && byDateRows) {
        for (const row of byDateRows as {
          employee_id: string
          work_date: string
          is_open: boolean
          start_time: string | null
          end_time: string | null
        }[]) {
          const ymd = row.work_date
          const k = `${row.employee_id}__${ymd}`
          const parts = ymd.split("-").map((x) => Number(x))
          const y = parts[0]!
          const mo = parts[1]!
          const da = parts[2]!
          const localD = new Date(y, mo - 1, da)
          ovr[k] = {
            day_of_week: localD.getDay(),
            is_open: Boolean(row.is_open),
            start_time: row.start_time,
            end_time: row.end_time,
          }
        }
      }

      const { data: lv, error: e3 } = await supabase
        .from("employee_leaves")
        .select("employee_id, start_date, end_date")
        .in("employee_id", empIds)
        .lte("start_date", w1)
        .gte("end_date", w0)

      if (!e3 && lv) {
        setLeaves(lv as LeaveRow[])
      } else {
        setLeaves([])
      }
    } else {
      setLeaves([])
    }

    setEmpWhByEid(empEwh)
    setDateOvrByKey(ovr)
    setDbTablesMissing(missingWhTables)
    if (!missingWhTables) setSaveError(null)

    setLoading(false)
  }, [cid, weekStart])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!sheetOpen || !selectedEmpId) return
    setFormDays(
      buildFormFromResolve(selectedEmpId, weekStart, workByDow, empWhByEid, dateOvrByKey)
    )
  }, [sheetOpen, selectedEmpId, weekStart, workByDow, empWhByEid, dateOvrByKey])

  const selectedName = useMemo(
    () => employees.find((e) => e.id === selectedEmpId)?.full_name ?? "",
    [employees, selectedEmpId]
  )

  function openEditSheet(empId: string) {
    setSelectedEmpId(empId)
    setTekrar("none")
    setSaveError(null)
    setSheetOpen(true)
  }

  function updateDay(dow: number, patch: Partial<DayForm>) {
    setFormDays((fd) => {
      const base = fd[dow] || { is_open: false, start_time: "09:00", end_time: "18:00" }
      return { ...fd, [dow]: { ...base, ...patch } }
    })
  }

  async function saveSheet() {
    if (!selectedEmpId) return
    setSaving(true)
    setSaveError(null)
    try {
      if (tekrar === "weekly") {
        const rows = Array.from({ length: 7 }, (_, dow) => {
          const f = formDays[dow] || {
            is_open: false,
            start_time: "09:00",
            end_time: "18:00",
          }
          return {
            company_id: cid,
            employee_id: selectedEmpId,
            day_of_week: dow,
            is_open: f.is_open,
            start_time: f.start_time.slice(0, 5),
            end_time: f.end_time.slice(0, 5),
          }
        })
        const { error } = await supabase
          .from("employee_working_hours")
          .upsert(rows, { onConflict: "employee_id,day_of_week" })
        if (error) throw error
      } else {
        const rows = DOW_TR.map(({ dow }) => {
          const f = formDays[dow] || {
            is_open: false,
            start_time: "09:00",
            end_time: "18:00",
          }
          const d = dateForDowInWeek(weekStart, dow)
          return {
            company_id: cid,
            employee_id: selectedEmpId,
            work_date: format(d, "yyyy-MM-dd"),
            is_open: f.is_open,
            start_time: f.start_time.slice(0, 5),
            end_time: f.end_time.slice(0, 5),
          }
        })
        const { error } = await supabase
          .from("employee_working_by_date")
          .upsert(rows, { onConflict: "employee_id,work_date" })
        if (error) throw error
      }
      setSheetOpen(false)
      setSelectedEmpId("")
      await load()
    } catch (e) {
      console.error(e)
      if (isMissingTableError(e)) {
        setSaveError(
          "Veritabanı tabloları (employee_working_hours / employee_working_by_date) yok. Supabase → SQL Editor’da proje kökündeki `supabase/employee_working_per_employee.sql` dosyasının tamamını çalıştırın, ardından bu sayfayı yenileyin."
        )
      } else {
        const msg =
          e && typeof e === "object" && "message" in e && typeof (e as { message: string }).message === "string"
            ? (e as { message: string }).message
            : "Kayıt başarısız. Konsolu kontrol edin."
        setSaveError(msg)
      }
    } finally {
      setSaving(false)
    }
  }

  function goThisWeek() {
    setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
  }

  function goPrev() {
    setWeekStart((w) => addWeeks(w, -1))
  }

  function goNext() {
    setWeekStart((w) => addWeeks(w, 1))
  }

  return (
    <>
      {dbTablesMissing && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          <p className="font-semibold">Veritabanı tabloları eksik (PGRST205)</p>
          <p className="mt-1 text-amber-900/90">
            Kişi bazlı saatler için Supabase’de <code className="rounded bg-amber-100/80 px-1">employee_working_hours</code> ve{" "}
            <code className="rounded bg-amber-100/80 px-1">employee_working_by_date</code> gerekir. Projedeki{" "}
            <code className="rounded bg-amber-100/80 px-0.5">supabase/employee_working_per_employee.sql</code> dosyasını SQL
            Editor’da <strong>tamamını</strong> çalıştırın; birkaç saniye sonra sayfayı yenileyin.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={goThisWeek}>
            Bu hafta
          </Button>
          <div className="inline-flex items-center gap-0 rounded-lg border border-slate-200 bg-white">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={goPrev}
              aria-label="Önceki hafta"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 py-1.5 text-sm text-slate-700 tabular-nums min-w-[200px] text-center">
              {rangeLabel}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={goNext}
              aria-label="Sonraki hafta"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled>
            İzinler
          </Button>
          <Button type="button" size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            İzin ekle +
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr className="bg-slate-50/80">
                  <th className="text-left pl-4 pr-3 py-3 text-xs font-semibold text-slate-500 border-b border-slate-200 sticky left-0 bg-slate-50/95 z-10 w-[200px]">
                    Çalışanlar
                  </th>
                  {weekDays.map((d) => (
                    <th
                      key={d.toISOString()}
                      className="text-center px-2 py-3 text-xs font-semibold text-slate-600 border-b border-slate-200 min-w-[100px]"
                    >
                      {format(d, "d MMMM, EEE", { locale: tr })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-12 text-center text-sm text-slate-500 border-b border-slate-100"
                    >
                      Aktif çalışan yok. Önce çalışan ekleyin.
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/50">
                      <td className="pl-4 pr-3 py-3 border-b border-slate-100 sticky left-0 bg-white z-10">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold text-white leading-none"
                            style={{ backgroundColor: emp.color || "#64748b" }}
                          >
                            {employeeInitials(emp.full_name)}
                          </div>
                          <span className="text-sm font-medium text-slate-800 truncate">
                            {emp.full_name}
                          </span>
                        </div>
                      </td>
                      {weekDays.map((d) => {
                        const wh = resolveWorkDay(emp.id, d, workByDow, empWhByEid, dateOvrByKey)
                        const open = wh?.is_open
                        const onLeave = leaves.some(
                          (L) =>
                            L.employee_id === emp.id &&
                            dateInLeaveRange(d, L.start_date, L.end_date)
                        )
                        if (onLeave) {
                          return (
                            <td key={d.toISOString()} className="p-1.5 border-b border-slate-100 align-middle">
                              <div className="min-h-[52px] rounded-lg bg-rose-50 flex items-center justify-center">
                                <Ban className="h-4 w-4 text-rose-500/80" />
                              </div>
                            </td>
                          )
                        }
                        if (!open) {
                          return (
                            <td key={d.toISOString()} className="p-1.5 border-b border-slate-100 align-middle">
                              <button
                                type="button"
                                onClick={() => openEditSheet(emp.id)}
                                className="w-full min-h-[52px] rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-center text-blue-600 hover:bg-slate-100/90 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                aria-label="Çalışma saati ekle"
                              >
                                <Plus className="h-4 w-4" strokeWidth={1.5} />
                              </button>
                            </td>
                          )
                        }
                        return (
                          <td key={d.toISOString()} className="p-1.5 border-b border-slate-100 align-middle">
                            <button
                              type="button"
                              onClick={() => openEditSheet(emp.id)}
                              className="w-full min-h-[52px] rounded-lg border border-[#b8e0c8] flex flex-nowrap items-center justify-center gap-x-2.5 px-2 py-2 hover:brightness-[0.99] transition-[filter] cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
                              style={{ backgroundColor: "#e6f4ea" }}
                              aria-label="Çalışma saatini düzenle"
                            >
                              <span className="text-[13px] font-semibold tabular-nums text-emerald-900/90">
                                {formatHm(wh.start_time)}
                              </span>
                              <span className="text-[13px] font-semibold tabular-nums text-emerald-900/90">
                                {formatHm(wh.end_time)}
                              </span>
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-4 text-xs text-slate-600">
        <div className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm border border-[#cde9d3]" style={{ backgroundColor: "#e6f4ea" }} />
          <span>Çalışma saatleri</span>
        </div>
        <div className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-rose-100 border border-rose-200/60 inline-flex items-center justify-center">
            <Ban className="h-2 w-2 text-rose-500" />
          </span>
          <span>İzinli günler/saatler</span>
        </div>
        <div className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-slate-100 border border-slate-200/80" />
          <span>Kapalı günler</span>
        </div>
      </div>

      <Sheet
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o)
          if (!o) setSelectedEmpId("")
        }}
      >
        <SheetContent className="flex w-full max-w-md flex-col p-0" side="right">
          <SheetHeader className="text-left border-b border-slate-100 pb-4">
            {selectedName && (
              <p className="text-base font-semibold text-slate-900 mb-1">{selectedName}</p>
            )}
            <SheetTitle>Çalışma saatini düzenle</SheetTitle>
            <p className="text-xs text-slate-500 font-normal pr-2">
              Haftalık: bu çalışan için her hafta aynı günler. Tekrarlanmaz: yalnızca üstteki hafta
              aralığındaki (takvim) günlere kaydedilir. İşletme saatleri, kişi kaydı yoksa varsayılır.
            </p>
          </SheetHeader>
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="wh-emp" className="text-slate-700">
                Çalışan adı
              </Label>
              <Select
                value={selectedEmpId || undefined}
                onValueChange={setSelectedEmpId}
                disabled={employees.length === 0}
              >
                <SelectTrigger id="wh-emp" className="h-10">
                  <SelectValue placeholder="Çalışan seçin" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-medium text-slate-500">Tarih aralığı</span>
              <div className="inline-flex w-full max-w-sm items-center gap-0 rounded-lg border border-slate-200 bg-slate-50/80">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={goPrev}
                  aria-label="Önceki hafta"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="flex-1 py-2 text-center text-sm text-slate-700 tabular-nums">
                  {rangeLabel}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={goNext}
                  aria-label="Sonraki hafta"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {DOW_TR.map(({ dow, label }) => {
                const f = formDays[dow] || {
                  is_open: false,
                  start_time: "09:00",
                  end_time: "18:00",
                }
                const startVal = timeSelectValue(f.start_time, "09:00")
                const endVal = timeSelectValue(f.end_time, "18:00")
                return (
                  <div
                    key={dow}
                    className="space-y-2 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-slate-800">{label}</span>
                      <Switch
                        checked={f.is_open}
                        onCheckedChange={(c) => updateDay(dow, { is_open: c })}
                        className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={startVal}
                        onValueChange={(v) => updateDay(dow, { start_time: v })}
                        disabled={!f.is_open}
                      >
                        <SelectTrigger
                          className={cn(
                            "h-9 flex-1 min-w-0",
                            f.is_open
                              ? "border-slate-200 bg-white text-slate-900"
                              : "border-slate-100 bg-slate-50 text-slate-400"
                          )}
                        >
                          <SelectValue placeholder="Başlangıç" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 z-[200]">
                          {timeOptionsFor(f.start_time).map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={endVal}
                        onValueChange={(v) => updateDay(dow, { end_time: v })}
                        disabled={!f.is_open}
                      >
                        <SelectTrigger
                          className={cn(
                            "h-9 flex-1 min-w-0",
                            f.is_open
                              ? "border-slate-200 bg-white text-slate-900"
                              : "border-slate-100 bg-slate-50 text-slate-400"
                          )}
                        >
                          <SelectValue placeholder="Bitiş" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 z-[200]">
                          {timeOptionsFor(f.end_time).map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-700">Tekrarlama</Label>
              <Select
                value={tekrar}
                onValueChange={(v) => setTekrar(v as TekrarMode)}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tekrarlanmaz</SelectItem>
                  <SelectItem value="weekly">Haftalık</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <SheetFooter className="bg-slate-50/50 flex-col items-stretch gap-2 sm:flex-col">
            {saveError && (
              <p
                role="alert"
                className="text-sm text-red-800 rounded-md border border-red-200 bg-red-50 px-3 py-2"
              >
                {saveError}
              </p>
            )}
            <div className="flex w-full flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setSheetOpen(false)} className="text-slate-600">
              Vazgeç
            </Button>
            <Button
              type="button"
              onClick={saveSheet}
              disabled={saving || !selectedEmpId || employees.length === 0}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Kaydet
            </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}

const TIME_OPTIONS: string[] = (() => {
  const o: string[] = []
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      o.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`)
    }
  }
  return o
})()

function timeOptionsFor(current: string): string[] {
  const t = (current || "09:00").slice(0, 5)
  if (TIME_OPTIONS.includes(t)) return TIME_OPTIONS
  return [...TIME_OPTIONS, t].sort()
}

/** مقدار کنترل‌شده‌ی Select تا همیشه با آیتم‌ها همخوان باشد */
function timeSelectValue(t: string | undefined, fallback: string): string {
  const s = (t && String(t).trim()) || fallback
  const raw = s.slice(0, 5)
  if (TIME_OPTIONS.includes(raw)) return raw
  const opts = timeOptionsFor(raw)
  if (opts.includes(raw)) return raw
  return fallback
}
