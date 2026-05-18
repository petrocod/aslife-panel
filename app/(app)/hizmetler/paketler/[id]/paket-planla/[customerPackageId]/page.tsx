"use client"

export const dynamic = "force-dynamic"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  addDays,
  addMinutes,
  addMonths,
  format,
  getDaysInMonth,
  setHours,
  setMinutes,
  startOfDay,
} from "date-fns"
import {
  Loader2,
  User,
  Calendar,
  Bell,
  ListTodo,
  Clock,
  Trash2,
} from "lucide-react"
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
import { DateInput } from "@/components/shared/DateInput"
import { supabaseData as supabase } from "@/lib/supabase-data"
import { useCompany, DEMO_COMPANY_ID } from "@/hooks/useCompany"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { hasAppointmentConflicts, type AppointmentSlot } from "@/lib/appointments/conflict-check"
import { ConflictWarnDialog } from "@/components/appointments/ConflictWarnDialog"

/** Takvim randevu formu ile aynı 15 dk aralıklar */
const TIME_SELECT_OPTIONS = Array.from({ length: 24 * 4 }, (_, i) => {
  const h = Math.floor(i / 4)
  const m = (i % 4) * 15
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
})

const DAY_BTNS: { k: number; label: string }[] = [
  { k: 0, label: "Pzt" },
  { k: 1, label: "Sa" },
  { k: 2, label: "Çar" },
  { k: 3, label: "Per" },
  { k: 4, label: "Cu" },
  { k: 5, label: "Cts" },
  { k: 6, label: "Paz" },
]

function mondayZeroFromDate(d: Date) {
  return (d.getDay() + 6) % 7
}

const DAY_NAMES_TR = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
]

export type PlannedAppointmentRow = {
  id: string
  dateIso: string
  startHm: string
  endHm: string
  employeeId: string
  locationId: string | null
}

function slotId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function datesToPlanRows(
  dates: Date[],
  durationMin: number,
  fallbackEmployeeId: string
): PlannedAppointmentRow[] {
  const dur = Math.max(15, durationMin)
  return dates.map((dt) => {
    const sh = `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`
    const endDt = addMinutes(dt, dur)
    const eh = `${String(endDt.getHours()).padStart(2, "0")}:${String(endDt.getMinutes()).padStart(2, "0")}`
    return {
      id: slotId(),
      dateIso: format(dt, "yyyy-MM-dd"),
      startHm: sh,
      endHm: eh,
      employeeId: fallbackEmployeeId,
      locationId: null,
    }
  })
}

/** Seçilen günler ve «her N hafta» ile ilk toplam seans kadar tarih (eski → yeni). */
function computeSessionDates(opts: {
  first: Date
  totalSessions: number
  weekDays: Set<number>
  everyNWeeks: number
}): Date[] {
  const { first, totalSessions, weekDays, everyNWeeks } = opts
  const firstMs = first.getTime()
  const hh = first.getHours()
  const mm = first.getMinutes()
  const anchor = startOfDay(first)
  const every = Math.max(1, Math.min(4, everyNWeeks))

  const out: Date[] = []
  for (let dayIdx = 0; out.length < totalSessions && dayIdx < 500; dayIdx++) {
    const curDay = addDays(anchor, dayIdx)
    const weeksSince = Math.floor(dayIdx / 7)
    if (every > 1 && weeksSince % every !== 0) continue
    const dow = mondayZeroFromDate(curDay)
    if (!weekDays.has(dow)) continue
    const slot = setMinutes(setHours(new Date(curDay), hh), mm)
    if (slot.getTime() >= firstMs - 60000) out.push(slot)
  }
  return out
}

function snapDayOfMonth(year: number, month: number, preferredDom: number): number {
  const dim = getDaysInMonth(new Date(year, month))
  return Math.min(Math.max(1, preferredDom), dim)
}

function composeLocalDate(
  y: number,
  m: number,
  preferredDom: number,
  hh: number,
  mi: number
): Date {
  const d = snapDayOfMonth(y, m, preferredDom)
  return setMinutes(setHours(new Date(y, m, d), hh), mi)
}

/** Aynı «ayın günü», her ay bir sonraki ay. */
function computeMonthlySessionDates(
  anchor: Date,
  totalSessions: number,
  preferredDom: number
): Date[] {
  const hh = anchor.getHours()
  const mi = anchor.getMinutes()
  let y = anchor.getFullYear()
  let mo = anchor.getMonth()
  let cur = composeLocalDate(y, mo, preferredDom, hh, mi)
  let guard = 0
  while (cur.getTime() < anchor.getTime() - 60_000 && guard++ < 240) {
    const nm = addMonths(new Date(y, mo, 1), 1)
    y = nm.getFullYear()
    mo = nm.getMonth()
    cur = composeLocalDate(y, mo, preferredDom, hh, mi)
  }
  const out: Date[] = [cur]
  y = cur.getFullYear()
  mo = cur.getMonth()
  for (let i = 1; i < totalSessions; i++) {
    const nm = addMonths(new Date(y, mo, 1), 1)
    y = nm.getFullYear()
    mo = nm.getMonth()
    cur = composeLocalDate(y, mo, preferredDom, hh, mi)
    out.push(cur)
  }
  return out
}

type PlanFormDefaults = {
  startDate: string
  endDate: string
  firstDate: string
  firstTime: string
  monthRepeatDay: string
}

type PkgSvc = {
  sessions: number
  services: {
    id: string
    name: string
    price: number | null
    duration_hours: number | null
    duration_minutes: number | null
  } | null
}

export default function PaketPlanlamaPage() {
  const params = useParams()
  const router = useRouter()
  const packageTemplateId = params.id as string
  const customerPackageId = params.customerPackageId as string
  const { companyId } = useCompany()
  const cid = companyId || DEMO_COMPANY_ID

  const [loading, setLoading] = useState(true)
  const [fatalError, setFatalError] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [pkgName, setPkgName] = useState("")
  const [customerId, setCustomerId] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [packageServices, setPackageServices] = useState<PkgSvc[]>([])
  const [selectedServiceIndex, setSelectedServiceIndex] = useState(0)
  const [sms, setSms] = useState(true)
  const [email, setEmail] = useState(true)
  const [whatsapp, setWhatsapp] = useState(true)
  const [repeatType, setRepeatType] = useState<"weekly" | "monthly">("weekly")
  const [everyNWeeks, setEveryNWeeks] = useState("1")
  const [monthRepeatDay, setMonthRepeatDay] = useState("")
  const [employeeId, setEmployeeId] = useState("")
  const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([])
  const [firstDate, setFirstDate] = useState("")
  const [firstTime, setFirstTime] = useState("09:00")
  const [days, setDays] = useState<Set<number>>(new Set([2, 4]))
  const [plannedRows, setPlannedRows] = useState<PlannedAppointmentRow[]>([])
  const [saving, setSaving] = useState(false)
  const [showConflictWarn, setShowConflictWarn] = useState(false)
  const [pendingGoCalendar, setPendingGoCalendar] = useState(false)
  const planFormDefaultsRef = useRef<PlanFormDefaults | null>(null)
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([])

  const todayMinIso = useMemo(
    () => format(startOfDay(new Date()), "yyyy-MM-dd"),
    []
  )

  /** Paket geçerlilik penceresi: bugünden ve başlangıçtan önce olmayan tarih. */
  const planWindowMinIso = useMemo(() => {
    if (!startDate) return todayMinIso
    return startDate > todayMinIso ? startDate : todayMinIso
  }, [startDate, todayMinIso])

  const planWindowMaxIso = useMemo(() => {
    if (!endDate) return planWindowMinIso
    return endDate < planWindowMinIso ? planWindowMinIso : endDate
  }, [endDate, planWindowMinIso])

  const totalSessions = useMemo(() => {
    const ix = Math.min(
      selectedServiceIndex,
      Math.max(0, packageServices.length - 1)
    )
    const ps = packageServices[ix]
    return Math.max(0, Number(ps?.sessions) || 0)
  }, [packageServices, selectedServiceIndex])

  const primaryService = useMemo(() => {
    const ix = Math.min(
      selectedServiceIndex,
      Math.max(0, packageServices.length - 1)
    )
    return packageServices[ix]?.services
  }, [packageServices, selectedServiceIndex])

  const summaryText = useMemo(() => {
    if (plannedRows.length === 0) return ""
    const r0 = plannedRows[0]
    const [yy, mo, dd] = r0.dateIso.split("-").map(Number)
    const [hh, mm] = r0.startHm.split(":").map(Number)
    const first = new Date(yy, mo - 1, dd, hh || 0, mm || 0)

    if (repeatType === "monthly") {
      const dom = Number(monthRepeatDay) || first.getDate()
      return `${format(first, "dd.MM.yyyy")} tarihinden itibaren randevular ayın ${dom}. gününde aylık tekrarlanır.`
    }

    const names = Array.from(days)
      .sort((a, b) => a - b)
      .map((d) => DAY_NAMES_TR[d])
    if (names.length === 0) return ""

    let dayPart = names[0] ?? ""
    if (names.length === 2) dayPart = `${names[0]} ve ${names[1]}`
    if (names.length > 2)
      dayPart = `${names.slice(0, -1).join(", ")} ve ${names[names.length - 1]}`
    return `${format(first, "dd.MM.yyyy")} tarihinden itibaren randevular her ${dayPart} tekrarlanır.`
  }, [plannedRows, days, repeatType, monthRepeatDay])


  const load = useCallback(async () => {
    setLoading(true)
    setPlannedRows([])
    setFatalError(null)
    const { data, error } = await supabase
      .from("customer_packages")
      .select(
        `id, customer_id, start_date, end_date, package_id,
         customers(full_name),
         packages(id, name, package_services(sessions, services(id, name, price, duration_hours, duration_minutes)))`
      )
      .eq("id", customerPackageId)
      .eq("company_id", cid)
      .single()

    if (error || !data) {
      setFatalError(error?.message || "Kayıt bulunamadı.")
      setLoading(false)
      return
    }

    const row = data as unknown as {
      customer_id: string
      package_id: string
      start_date: string
      end_date: string | null
      customers: { full_name: string } | null
      packages: {
        id: string
        name: string
        package_services: PkgSvc[]
      } | null
    }

    const pkgRow = row.packages
    if (!pkgRow || pkgRow.id !== packageTemplateId || row.package_id !== packageTemplateId) {
      setFatalError("Paket eşlemesi doğrulanamadı.")
      setLoading(false)
      return
    }

    setCustomerId(row.customer_id)
    setCustomerName(row.customers?.full_name ?? "")
    setPkgName(pkgRow.name)
    setPackageServices(pkgRow.package_services || [])
    setSelectedServiceIndex(0)

    let start =
      row.start_date?.slice(0, 10) ?? format(new Date(), "yyyy-MM-dd")
    const todayIso = format(startOfDay(new Date()), "yyyy-MM-dd")
    if (start < todayIso) start = todayIso

    let endD =
      row.end_date?.slice(0, 10) ?? row.start_date?.slice(0, 10) ?? start
    if (endD < start) endD = start

    setStartDate(start)
    setEndDate(endD)
    setFirstDate(start)
    const domFromStart = Number(start.slice(8, 10))
    const domStr =
      !Number.isNaN(domFromStart) && domFromStart >= 1 && domFromStart <= 31
        ? String(domFromStart)
        : ""
    if (domStr) setMonthRepeatDay(domStr)
    else setMonthRepeatDay("")

    planFormDefaultsRef.current = {
      startDate: start,
      endDate: endD,
      firstDate: start,
      firstTime: "09:00",
      monthRepeatDay: domStr,
    }

    setLoading(false)
  }, [customerPackageId, packageTemplateId, cid])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    supabase
      .from("employees")
      .select("id, full_name")
      .eq("company_id", cid)
      .order("full_name")
      .then(({ data }) =>
        setEmployees((data as { id: string; full_name: string }[]) || [])
      )
  }, [cid])

  useEffect(() => {
    supabase
      .from("service_locations")
      .select("id, name")
      .eq("company_id", cid)
      .order("name")
      .then(({ data }) =>
        setLocations((data as { id: string; name: string }[]) || [])
      )
  }, [cid])

  useEffect(() => {
    if (!firstDate || !planWindowMinIso) return
    if (firstDate < planWindowMinIso) {
      setFirstDate(planWindowMinIso)
      return
    }
    if (firstDate > planWindowMaxIso) setFirstDate(planWindowMaxIso)
  }, [planWindowMinIso, planWindowMaxIso, firstDate])

  function resetPlanningForm() {
    const d = planFormDefaultsRef.current
    if (!d) return
    setErr(null)
    setPlannedRows([])
    setStartDate(d.startDate)
    setEndDate(d.endDate)
    setRepeatType("weekly")
    setEveryNWeeks("1")
    setMonthRepeatDay(d.monthRepeatDay)
    setEmployeeId("")
    setFirstDate(d.firstDate)
    setFirstTime(d.firstTime)
    setDays(new Set())
    setSelectedServiceIndex(0)
    setSms(true)
    setEmail(true)
    setWhatsapp(true)
  }

  function toggleDay(k: number) {
    setDays((prev) => {
      const n = new Set(prev)
      if (n.has(k)) n.delete(k)
      else n.add(k)
      return n
    })
  }

  function updatePlannedRow(id: string, patch: Partial<PlannedAppointmentRow>) {
    setPlannedRows((rows) =>
      rows.map((r) => (r.id === id ? { ...r, ...patch } : r))
    )
  }

  function removePlannedRow(id: string) {
    setPlannedRows((rows) => rows.filter((r) => r.id !== id))
  }

  function handlePlanla() {
    setErr(null)
    if (!primaryService?.id) {
      setErr("Hizmet seçin veya pakette hizmet bulunamadı.")
      return
    }
    const sessions = Math.max(1, totalSessions || 1)

    if (!firstDate || !firstTime) {
      setErr("İlk tarih ve saat zorunludur.")
      return
    }

    const dh = Number(primaryService.duration_hours) || 0
    const dm = Number(primaryService.duration_minutes) || 0
    const durMin = dh * 60 + dm || 60

    const [th, tm] = firstTime.split(":").map(Number)
    const parts = firstDate.split("-").map(Number)
    const anchor =
      parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date()
    const first = setMinutes(
      setHours(startOfDay(anchor), Number.isFinite(th) ? th : 9),
      Number.isFinite(tm) ? tm : 0
    )

    if (repeatType === "monthly") {
      const dom = Number(monthRepeatDay)
      if (!Number.isFinite(dom) || dom < 1 || dom > 31) {
        setErr("Ayın kaçıncı günü için 1–31 arası girin.")
        return
      }
      const pts = computeMonthlySessionDates(first, sessions, dom)
      setPlannedRows(datesToPlanRows(pts, durMin, employeeId))
      return
    }

    if (days.size === 0) {
      setErr("En az bir gün seçin.")
      return
    }
    const nWeeks = Math.max(1, Math.min(4, Number(everyNWeeks) || 1))
    const pts = computeSessionDates({
      first,
      totalSessions: sessions,
      weekDays: days,
      everyNWeeks: nWeeks,
    })
    setPlannedRows(datesToPlanRows(pts, durMin, employeeId))
  }

  function plannedRowsToSlots(): AppointmentSlot[] {
    return plannedRows.map((row) => ({
      date: row.dateIso,
      start: row.startHm,
      end: row.endHm,
      employeeId: row.employeeId,
      locationId: row.locationId,
    }))
  }

  async function requestPersist(goCalendar: boolean) {
    if (!primaryService?.id || plannedRows.length === 0) {
      setErr(
        plannedRows.length === 0
          ? "Önce «Planla» ile randevu satırlarını oluşturun."
          : "Paket hizmeti bulunamadı."
      )
      return
    }
    if (plannedRows.some((r) => !r.employeeId)) {
      setErr("Her randevu satırı için çalışan seçin.")
      return
    }

    const conflict = await hasAppointmentConflicts(supabase, plannedRowsToSlots())
    if (conflict) {
      setPendingGoCalendar(goCalendar)
      setShowConflictWarn(true)
      return
    }
    await persistAndRedirect(goCalendar)
  }

  async function persistAndRedirect(goCalendar: boolean) {
    setSaving(true)
    setErr(null)

    for (const row of plannedRows) {
      const { error } = await supabase.from("appointments").insert({
        company_id: cid,
        customer_id: customerId,
        service_id: primaryService.id,
        employee_id: row.employeeId,
        location_id: row.locationId,
        appointment_date: row.dateIso,
        start_time: `${row.startHm}:00`,
        end_time: `${row.endHm}:00`,
        price: primaryService.price != null ? Number(primaryService.price) : 0,
        discount: 0,
        status: "approved",
        notes: `${pkgName} paketi (${customerPackageId.slice(0, 8)}) · ${
          repeatType === "weekly" ? "haftalık plan" : "aylık plan"
        }`,
      })

      if (error) {
        setErr(error.message)
        setSaving(false)
        return
      }
    }

    setSaving(false)
    if (goCalendar) router.push("/randevular/takvim")
    else router.push(`/musteriler/${customerId}/paket/${customerPackageId}`)
  }

  if (!loading && fatalError) {
    return (
      <div className="p-8 text-center text-slate-600">
        <p className="text-red-600">{fatalError}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Geri
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
      </div>
    )
  }

  const planCount = totalSessions || 1

  return (
    <div className="min-h-full w-full bg-slate-50/80 pb-28">
      <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:max-w-none lg:px-10 xl:px-12">
        {err && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{err}</p>
        )}

        <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[220px_1fr] lg:gap-8 lg:items-start">
            <div className="flex items-start gap-2 text-sm font-semibold text-slate-700">
              <User className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
              Müşteri adı <span className="text-red-500">*</span>
            </div>
            <div className="min-w-0 lg:col-start-2 lg:max-w-md">
              <input
                readOnly
                value={customerName}
                className="h-10 w-full max-w-md rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none"
              />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[220px_1fr] lg:gap-8 lg:items-start">
            <div className="flex items-start gap-2 text-sm font-semibold text-slate-700">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
              Başlangıç ve bitiş tarihi
            </div>
            <div className="flex flex-wrap gap-3 lg:max-w-lg">
              <div className="w-[calc(50%-0.375rem)] min-w-[8.5rem] max-w-[13rem] sm:w-auto sm:min-w-[10rem]">
                <Label className="sr-only">Başlangıç</Label>
                <DateInput
                  value={startDate}
                  min={todayMinIso}
                  max={endDate || undefined}
                  disablePast
                  onChange={(v) => {
                    setStartDate(v)
                    setPlannedRows([])
                    setEndDate((e) => (e && e < v ? v : e))
                  }}
                />
              </div>
              <div className="w-[calc(50%-0.375rem)] min-w-[8.5rem] max-w-[13rem] sm:w-auto sm:min-w-[10rem]">
                <Label className="sr-only">Bitiş</Label>
                <DateInput
                  value={endDate}
                  min={startDate >= todayMinIso ? startDate : todayMinIso}
                  disablePast
                  onChange={(v) => {
                    setEndDate(v)
                    setPlannedRows([])
                  }}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[220px_1fr] lg:gap-8 lg:items-start">
            <div className="flex items-start gap-2 text-sm font-semibold text-slate-700">
              <Bell className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
              Bildirim seçenekleri
            </div>
            <div className="flex flex-wrap gap-6">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Switch checked={sms} onCheckedChange={setSms} /> Sms bildirimi
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Switch checked={email} onCheckedChange={setEmail} /> E-posta bildirimi
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Switch checked={whatsapp} onCheckedChange={setWhatsapp} /> WhatsApp
              </label>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[220px_1fr] lg:gap-8 lg:items-start">
            <div className="flex items-start gap-2 text-sm font-semibold text-slate-700">
              <ListTodo className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
              Hizmet <span className="text-red-500">*</span>
            </div>
            <div>
              {packageServices.length === 0 ? (
                <p className="text-sm text-red-600">Bu pakete bağlı hizmet bulunamadı.</p>
              ) : (
                <Select
                  value={String(
                    Math.min(
                      selectedServiceIndex,
                      Math.max(0, packageServices.length - 1)
                    )
                  )}
                  onValueChange={(v) => {
                    const i = Number(v)
                    if (Number.isFinite(i)) setSelectedServiceIndex(i)
                    setPlannedRows([])
                    setErr(null)
                  }}
                >
                  <SelectTrigger className="max-w-xl">
                    <SelectValue placeholder="Planlanacak hizmet satırını seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {packageServices.map((ps, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {(ps.services?.name ?? "—") + ` (${Number(ps.sessions) || 0} Seans)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="mt-2 text-xs text-slate-500">
                Çoklu hizmet satırından planlamak için listeden seçin.
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[220px_1fr] lg:gap-8 lg:items-start">
            <label className="text-sm font-semibold text-slate-700">Tekrarlama türü *</label>
            <Select
              value={repeatType}
              onValueChange={(v) => {
                const t = v as "weekly" | "monthly"
                setRepeatType(t)
                setPlannedRows([])
                setErr(null)
              }}
            >
              <SelectTrigger className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Haftalık</SelectItem>
                <SelectItem value="monthly">Aylık</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {repeatType === "weekly" && (
            <div className="grid gap-6 lg:grid-cols-[220px_1fr] lg:gap-8 lg:items-start">
              <label className="text-sm font-semibold text-slate-700">
                Kaç haftada bir tekrarlanır <span className="text-red-500">*</span>
              </label>
              <Select value={everyNWeeks} onValueChange={(v) => { setEveryNWeeks(v); setPlannedRows([]) }}>
                <SelectTrigger className="max-w-md">
                  <SelectValue placeholder="Seçiniz..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Her hafta</SelectItem>
                  <SelectItem value="2">2 haftada bir tekrarlansın</SelectItem>
                  <SelectItem value="3">3 haftada bir tekrarlasın</SelectItem>
                  <SelectItem value="4">4 haftada bir tekrarlansın</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[220px_1fr] lg:gap-8 lg:items-start">
            <label className="text-sm font-semibold text-slate-700">Varsayılan çalışan *</label>
            <div className="max-w-md space-y-1.5">
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger>
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
              <p className="text-xs text-slate-500">
                Seçilen çalışan tüm randevular için varsayılan olarak atanacaktır.
              </p>
            </div>
          </div>

          {repeatType === "monthly" && (
            <div className="grid gap-6 lg:grid-cols-[220px_1fr] lg:gap-8 lg:items-start">
              <Label className="text-sm font-semibold text-slate-700 pt-2">
                Ayın kaçıncı günü tekrarlasın <span className="text-red-500">*</span>
              </Label>
              <div>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  value={monthRepeatDay}
                  onChange={(e) => {
                    setMonthRepeatDay(e.target.value)
                    setPlannedRows([])
                  }}
                  className="max-w-[10rem]"
                  placeholder="1–31"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Sadece 1 ile 31 arası sayı girebilirsiniz.
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[220px_1fr] lg:gap-8 lg:items-start">
            <div className="flex items-start gap-2 text-sm font-semibold text-slate-700">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
              İlk randevu tarihi ve saati <span className="text-red-500">*</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <DateInput
                value={firstDate}
                min={planWindowMinIso}
                max={planWindowMaxIso}
                disablePast
                onChange={(v) => {
                  setFirstDate(v)
                  setPlannedRows([])
                }}
                className="max-w-[13rem]"
              />
              <Select
                value={firstTime}
                onValueChange={(v) => {
                  setFirstTime(v)
                  setPlannedRows([])
                }}
              >
                <SelectTrigger className="h-10 w-[min(100%,11rem)] sm:w-[10.5rem]">
                  <SelectValue placeholder="Saat seçiniz" />
                </SelectTrigger>
                <SelectContent className="max-h-[min(280px,50vh)]">
                  {TIME_SELECT_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {repeatType === "weekly" && (
            <div className="grid gap-4 lg:grid-cols-[220px_1fr] lg:gap-8">
              <label className="text-sm font-semibold text-slate-700">
                Haftanın günleri <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {DAY_BTNS.map(({ k, label }) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => toggleDay(k)}
                    className={cn(
                      "h-10 min-w-[2.75rem] rounded-full border text-sm font-medium transition-colors",
                      days.has(k)
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="outline"
              className="gap-2 border-blue-600 text-blue-700 hover:bg-blue-50"
              onClick={handlePlanla}
            >
              Planla ({planCount})
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2 text-red-600 hover:bg-red-50"
              onClick={resetPlanningForm}
            >
              <Trash2 className="h-4 w-4" />
              Temizle
            </Button>
            {summaryText && <p className="text-xs text-slate-600">{summaryText}</p>}
          </div>

          {plannedRows.length > 0 && (
            <div className="space-y-4 border-t border-slate-100 pt-6">
              <p className="text-sm font-semibold text-slate-800">
                Planlanan randevular ({plannedRows.length}) — kaydetmeden düzenleyebilirsiniz.
              </p>
              <div className="space-y-3">
                {plannedRows.map((row, idx) => (
                  <div
                    key={row.id}
                    className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-4 lg:flex-row lg:flex-wrap lg:items-end"
                  >
                    <div className="text-xs font-semibold text-slate-600 lg:w-full">
                      {idx + 1}. Randevu
                    </div>
                    <div className="flex min-w-[10rem] flex-col gap-1">
                      <Label className="text-xs text-slate-500">Tarih</Label>
                      <DateInput
                        value={row.dateIso}
                        min={todayMinIso}
                        max={endDate || undefined}
                        disablePast
                        onChange={(iso) => updatePlannedRow(row.id, { dateIso: iso })}
                      />
                    </div>
                    <div className="flex min-w-[14rem] flex-col gap-1">
                      <Label className="text-xs text-slate-500">Hizmet</Label>
                      <span className="truncate rounded-md border border-slate-100 bg-white px-3 py-2 text-sm text-slate-800">
                        {primaryService?.name ?? "—"}
                      </span>
                    </div>
                    <div className="min-w-[11rem] flex-col gap-1">
                      <Label className="text-xs text-slate-500">Çalışan</Label>
                      <Select
                        value={row.employeeId || "_none"}
                        onValueChange={(v) =>
                          updatePlannedRow(row.id, {
                            employeeId: v === "_none" ? "" : v,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Çalışan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">Çalışan seçin</SelectItem>
                          {employees.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <div className="flex min-w-[6.5rem] flex-col gap-1">
                        <Label className="text-xs text-slate-500">Başlangıç</Label>
                        <Select
                          value={row.startHm}
                          onValueChange={(v) => updatePlannedRow(row.id, { startHm: v })}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="max-h-48">
                            {TIME_SELECT_OPTIONS.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex min-w-[6.5rem] flex-col gap-1">
                        <Label className="text-xs text-slate-500">Bitiş</Label>
                        <Select
                          value={row.endHm}
                          onValueChange={(v) => updatePlannedRow(row.id, { endHm: v })}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="max-h-48">
                            {TIME_SELECT_OPTIONS.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {locations.length > 0 && (
                      <div className="min-w-[10rem] flex-col gap-1">
                        <Label className="text-xs text-slate-500">Yer</Label>
                        <Select
                          value={row.locationId ?? "_none"}
                          onValueChange={(v) =>
                            updatePlannedRow(row.id, {
                              locationId: v === "_none" ? null : v,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">—</SelectItem>
                            {locations.map((loc) => (
                              <SelectItem key={loc.id} value={loc.id}>
                                {loc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-red-600 hover:bg-red-50"
                      aria-label="Satırı sil"
                      onClick={() => removePlannedRow(row.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 py-4 pl-[calc(var(--sidebar-width,0px)+1rem)] backdrop-blur sm:pl-8">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-end gap-3 px-4 lg:max-w-none lg:px-10">
            <button
              type="button"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
              onClick={() => router.back()}
            >
              Vazgeç
            </button>
            <Button
              type="button"
              variant="secondary"
              disabled={saving || plannedRows.length === 0}
              onClick={() => void requestPersist(false)}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kaydet"}
            </Button>
            <Button
              type="button"
              className="bg-blue-600 hover:bg-blue-700"
              disabled={saving || plannedRows.length === 0}
              onClick={() => void requestPersist(true)}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Kaydet ve Takvime ekle
            </Button>
          </div>
        </div>
      </div>

      <ConflictWarnDialog
        open={showConflictWarn}
        onOpenChange={setShowConflictWarn}
        onCancel={() => setShowConflictWarn(false)}
        onContinue={() => {
          setShowConflictWarn(false)
          void persistAndRedirect(pendingGoCalendar)
        }}
        message="Planlanan randevulardan biri veya daha fazlası mevcut bir randevu ile çakışıyor. Yine de kaydetmek istiyor musunuz?"
      />
    </div>
  )
}
