"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import {
  format, addWeeks, subWeeks, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, isToday, parseISO,
  addDays, subDays, addMonths, subMonths,
  startOfMonth, endOfMonth, getDay,
} from "date-fns"
import { tr } from "date-fns/locale"
import { ChevronLeft, ChevronRight, ChevronDown, Plus, Calendar, Loader2, X, Check, Pencil, Trash2, Phone, MapPin, Clock, FileText, CreditCard, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { supabaseData as supabase } from "@/lib/supabase-data"
import { useCompany, DEMO_COMPANY_ID } from "@/hooks/useCompany"
import {
  maybeRecordIncomeOnAppointmentCompleted,
  recordIncomeFromAppointmentPayment,
} from "@/lib/finance/integration"
import { mapUiPaymentToPaymentsDbMethod } from "@/lib/finance/payment-method-map"
import {
  type WorkDayRow,
  dayEnvelopeMins,
  ymdToLocalDate,
  resolvedIntervalForEmployee,
} from "@/lib/working-hours-resolve"
import { NotificationSection } from "@/components/shared/NotificationSection"
import { DateInput } from "@/components/shared/DateInput"
import { sendUsageSmsOnCompletion } from "@/lib/auto-sms-triggers"

// ── Types ──────────────────────────────────────────────────────────────────
type DbAppointment = {
  id: string
  service_id: string | null
  appointment_date: string
  start_time: string
  end_time: string
  status: string
  price: number | null
  notes: string | null
  customers: { id: string; full_name: string; phone: string | null } | null
  services: { name: string; duration_hours: number; duration_minutes: number } | null
  employees: { full_name: string; color: string } | null
  service_locations: { name: string } | null
}

type Service = {
  id: string; name: string; price: number
  duration_hours: number; duration_minutes: number
  employee_id: string | null; location_id: string | null
}
type Employee = { id: string; full_name: string; color: string }
type Location = { id: string; name: string }
type Customer = { id: string; full_name: string; phone: string; email: string | null; sms_consent: boolean; email_consent: boolean; whatsapp_consent: boolean }

// ── Constants ──────────────────────────────────────────────────────────────
const DAY_NAMES = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"]
const SLOT_HEIGHT = 50  // px per 30-min slot
const SLOT_MINS   = 30
/** Vertical breathing room between stacked event cards + inset from slot grid */
const CARD_V_GUTTER = 3

// Generate 15-min time slots for picker (full 24h, for manual override)
const ALL_TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, i) => {
  const h = Math.floor(i / 4)
  const m = (i % 4) * 15
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
})

// Generate 15-min time slots within working hours
function getWorkingTimeOptions(workStart: string, workEnd: string) {
  const start = timeToMins(workStart)
  const end   = timeToMins(workEnd)
  return ALL_TIME_OPTIONS.filter((t) => {
    const m = timeToMins(t)
    return m >= start && m <= end
  })
}

function timeToMins(t: string) {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

function minsToTime(m: number) {
  return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
}

// ── Calendar helpers ───────────────────────────────────────────────────────
function topPx(startTime: string, dayStartMins: number) {
  const mins = timeToMins(startTime) - dayStartMins
  return (mins / SLOT_MINS) * SLOT_HEIGHT
}

function heightPx(startTime: string, endTime: string) {
  const dur = timeToMins(endTime) - timeToMins(startTime)
  return Math.max((dur / SLOT_MINS) * SLOT_HEIGHT, SLOT_HEIGHT)
}

function timesOverlap(a: DbAppointment, b: DbAppointment) {
  const as = a.start_time.slice(0, 5), ae = a.end_time.slice(0, 5)
  const bs = b.start_time.slice(0, 5), be = b.end_time.slice(0, 5)
  return as < be && ae > bs
}

function getOverlapGroups(apps: DbAppointment[]): DbAppointment[][] {
  const n = apps.length
  if (n === 0) return []
  const parent = Array.from({ length: n }, (_, i) => i)
  function find(i: number): number {
    if (parent[i] !== i) parent[i] = find(parent[i])
    return parent[i]
  }
  function union(i: number, j: number) {
    const ri = find(i), rj = find(j)
    if (ri !== rj) parent[ri] = rj
  }
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (timesOverlap(apps[i], apps[j])) union(i, j)
    }
  }
  const buckets = new Map<number, number[]>()
  for (let i = 0; i < n; i++) {
    const r = find(i)
    if (!buckets.has(r)) buckets.set(r, [])
    buckets.get(r)!.push(i)
  }
  return Array.from(buckets.values()).map((idx) => idx.map((k) => apps[k]))
}

/** Simultaneous events: same full width; stack vertically inside the union time block (not side-by-side). */
function layoutOverlapStack(apps: DbAppointment[], dayStartMins: number, cardGutter: number) {
  const out = new Map<string, { top: number; height: number; z: number }>()
  const innerG = 2
  for (const group of getOverlapGroups(apps)) {
    if (group.length === 1) {
      const a = group[0]
      const appStart = a.start_time.slice(0, 5)
      const appEnd = a.end_time.slice(0, 5)
      const t = topPx(appStart, dayStartMins)
      const h = heightPx(appStart, appEnd)
      out.set(a.id, { top: t + cardGutter, height: Math.max(h - 2 * cardGutter, 28), z: 10 })
    } else {
      const sorted = [...group].sort((a, b) => {
        const c = a.start_time.slice(0, 5).localeCompare(b.start_time.slice(0, 5))
        if (c !== 0) return c
        return a.id.localeCompare(b.id)
      })
      let minS = sorted[0].start_time.slice(0, 5)
      let maxE = sorted[0].end_time.slice(0, 5)
      for (const a of sorted) {
        if (a.start_time.slice(0, 5) < minS) minS = a.start_time.slice(0, 5)
        if (a.end_time.slice(0, 5) > maxE) maxE = a.end_time.slice(0, 5)
      }
      const poolTop = topPx(minS, dayStartMins) + cardGutter
      const poolH   = heightPx(minS, maxE) - 2 * cardGutter
      const N       = sorted.length
      const innerPad = (N + 1) * innerG
      const hEach   = Math.max((poolH - innerPad) / N, 20)
      sorted.forEach((a, i) => {
        out.set(a.id, {
          top: poolTop + innerG + i * (hEach + innerG),
          height: hEach,
          z: 10 + (N - 1 - i),
        })
      })
    }
  }
  return out
}

// ── Step sidebar ───────────────────────────────────────────────────────────
type SvcInfo = { name: string; employee: string; location: string; date: string; start: string; end: string }

function StepSidebar({
  step, serviceInfo, extraSvcInfos, onRemoveExtra, customerName,
}: {
  step: number
  serviceInfo?: SvcInfo
  extraSvcInfos?: (SvcInfo & { uid: string })[]
  onRemoveExtra?: (uid: string) => void
  customerName?: string
}) {
  const steps = [
    { n: 1, label: "Randevu Detay" },
    { n: 2, label: "Müşteri" },
    { n: 3, label: "Onay" },
  ]
  return (
    <div className="w-48 border-r border-slate-200 p-4 shrink-0 overflow-y-auto">
      {steps.map((s) => {
        const done = step > s.n
        const active = step === s.n
        return (
          <div key={s.n} className="mb-4">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                done ? "bg-blue-600 border-blue-600" :
                active ? "border-blue-600" : "border-slate-300"
              )}>
                {done ? <Check className="h-3 w-3 text-white" /> :
                  active ? <div className="w-2 h-2 bg-blue-600 rounded-full" /> : null}
              </div>
              <span className={cn("text-xs font-semibold", active ? "text-blue-600" : done ? "text-slate-500" : "text-slate-400")}>
                {s.label}
              </span>
            </div>

            {/* Extra services (shown before main service) */}
            {s.n === 1 && extraSvcInfos && extraSvcInfos.map((es) => (
              <div key={es.uid} className="ml-7 mt-2 space-y-0.5">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-medium text-blue-600 truncate">{es.name}</p>
                  <button
                    onClick={() => onRemoveExtra?.(es.uid)}
                    className="shrink-0 text-red-400 hover:text-red-600 transition-colors"
                    title="Kaldır"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                {[es.employee, es.location, es.date, es.start && es.end ? `${es.start} - ${es.end}` : ""].filter(Boolean).map((v, i) => (
                  <p key={i} className="text-xs text-slate-500 flex items-center gap-1">
                    <span className="w-1 h-1 bg-slate-400 rounded-full inline-block shrink-0" />{v}
                  </p>
                ))}
              </div>
            ))}

            {/* Main service */}
            {s.n === 1 && serviceInfo && (
              <div className="ml-7 mt-2 space-y-0.5">
                <div className="flex items-center gap-1">
                  <p className={cn("text-xs font-medium truncate", active || done ? "text-blue-600" : "text-slate-400")}>{serviceInfo.name}</p>
                  {serviceInfo.name && <Check className="h-3 w-3 text-blue-500 shrink-0" />}
                </div>
                {[serviceInfo.employee, serviceInfo.location, serviceInfo.date].filter(Boolean).map((v, i) => (
                  <p key={i} className="text-xs text-slate-500 flex items-center gap-1">
                    <span className="w-1 h-1 bg-slate-400 rounded-full inline-block shrink-0" />{v}
                  </p>
                ))}
              </div>
            )}

            {s.n === 2 && customerName && (
              <div className="ml-7 mt-1">
                <p className={cn("text-xs font-medium", active || done ? "text-blue-600" : "text-slate-400")}>{customerName}</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── New Appointment Modal ──────────────────────────────────────────────────
type WhMaps = {
  company: Record<number, WorkDayRow>
  empByEid: Record<string, Record<number, WorkDayRow>>
  byDate: Record<string, WorkDayRow>
}

function NewAppointmentModal({
  open, onClose, onSaved, defaultDate, defaultStartTime, workStart, workEnd, whMaps,
}: {
  open: boolean; onClose: () => void; onSaved: () => void
  defaultDate?: string
  /** Row click on calendar: start time (HH:MM) for new appointment */
  defaultStartTime?: string | null
  workStart: string; workEnd: string
  /** Gün/çalışan bazlı saat: null ise sadece workStart/End kullanılır */
  whMaps: WhMaps | null
}) {
  const { companyId } = useCompany()
  const companyForModal = companyId || DEMO_COMPANY_ID
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // Dropdown data
  const [services, setServices] = useState<Service[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])

  // Step 1 fields
  const [serviceId, setServiceId] = useState("")
  const [employeeId, setEmployeeId] = useState("")
  const [locationId, setLocationId] = useState("")
  const [durationHours, setDurationHours] = useState("1")
  const [durationMins, setDurationMins] = useState("0")
  const [appointmentDate, setAppointmentDate] = useState(defaultDate || format(new Date(), "yyyy-MM-dd"))
  const [startTime, setStartTime] = useState(workStart || "09:00")
  const [price, setPrice] = useState("")
  const [discount, setDiscount] = useState("")
  const [recurrence, setRecurrence] = useState("none")
  const [showDiscount, setShowDiscount] = useState(false)

  // Past date warning
  const [showPastWarn, setShowPastWarn] = useState(false)

  // Conflict warning (employee/location overlap)
  const [showConflictWarn, setShowConflictWarn] = useState(false)

  // Per-appointment notes (index 0 = main, 1+ = extra)
  const [apptNotes, setApptNotes] = useState<Record<number, string>>({})
  const [showNoteIdx, setShowNoteIdx] = useState<number | null>(null)

  // Extra services
  type ExtraSvc = { uid: string; serviceId: string; employeeId: string; locationId: string; durationHours: string; durationMins: string; price: string; date: string; time: string }
  const [extraServices, setExtraServices] = useState<ExtraSvc[]>([])
  const [activeExtraUid, setActiveExtraUid] = useState<string | null>(null)

  const mainWin = useMemo(() => {
    if (!whMaps || !employeeId || !appointmentDate) return { start: workStart, end: workEnd }
    const iv = resolvedIntervalForEmployee(
      employeeId,
      ymdToLocalDate(appointmentDate),
      whMaps.company,
      whMaps.empByEid,
      whMaps.byDate
    )
    return { start: iv?.start ?? workStart, end: iv?.end ?? workEnd }
  }, [whMaps, employeeId, appointmentDate, workStart, workEnd])

  function workWindow(empId: string, dateStr: string) {
    if (!whMaps || !empId || !dateStr) return { start: workStart, end: workEnd }
    const iv = resolvedIntervalForEmployee(empId, ymdToLocalDate(dateStr), whMaps.company, whMaps.empByEid, whMaps.byDate)
    return { start: iv?.start ?? workStart, end: iv?.end ?? workEnd }
  }

  function addExtraService() {
    const uid = crypto.randomUUID()
    setExtraServices((prev) => [...prev, { uid, serviceId: "", employeeId: "", locationId: "", durationHours: "1", durationMins: "0", price: "", date: appointmentDate, time: startTime }])
    setActiveExtraUid(uid)
  }
  function removeExtraService(uid: string) {
    setExtraServices((prev) => prev.filter((s) => s.uid !== uid))
  }
  function updateExtraService(uid: string, field: keyof ExtraSvc, value: string) {
    setExtraServices((prev) => prev.map((s) => {
      if (s.uid !== uid) return s
      const updated = { ...s, [field]: value }
      if (field === "serviceId") {
        const svc = services.find((sv) => sv.id === value)
        if (svc) {
          updated.price         = String(svc.price || "")
          updated.durationHours = String(svc.duration_hours || 1)
          updated.durationMins  = String(svc.duration_minutes || 0)
          if (svc.employee_id) updated.employeeId = svc.employee_id
          if (svc.location_id) updated.locationId = svc.location_id
        }
      }
      return updated
    }))
  }

  // Step 2 fields
  const [customerId, setCustomerId] = useState("")
  const [custPhone, setCustPhone] = useState("")
  const [custEmail, setCustEmail] = useState("")
  const [whatsappConsent, setWhatsappConsent] = useState(true)
  const [smsConsent, setSmsConsent] = useState(true)
  const [emailConsent, setEmailConsent] = useState(true)

  useEffect(() => {
    if (!open) return
    async function load() {
      const [{ data: svcs }, { data: emps }, { data: locs }, { data: custs }] = await Promise.all([
        supabase.from("services").select("id,name,price,duration_hours,duration_minutes,employee_id,location_id").eq("company_id", companyForModal).order("name"),
        supabase.from("employees").select("id,full_name,color").eq("company_id", companyForModal).eq("status","active").order("full_name"),
        supabase.from("service_locations").select("id,name").eq("company_id", companyForModal).order("name"),
        supabase.from("customers").select("id,full_name,phone,email,sms_consent,email_consent,whatsapp_consent").eq("company_id", companyForModal).order("full_name"),
      ])
      setServices(svcs || [])
      setEmployees(emps || [])
      setLocations(locs || [])
      setCustomers(custs || [])
    }
    load()
  }, [open, companyForModal])

  // When opening, apply clicked day + (optional) slot time as start
  useEffect(() => {
    if (!open) return
    setAppointmentDate(defaultDate || format(new Date(), "yyyy-MM-dd"))
    if (defaultStartTime != null && String(defaultStartTime).trim() !== "") {
      setStartTime(String(defaultStartTime).slice(0, 5))
    } else {
      setStartTime(workStart || "09:00")
    }
  }, [open, defaultDate, defaultStartTime, workStart])

  function handleServiceChange(id: string) {
    setServiceId(id)
    const svc = services.find((s) => s.id === id)
    if (!svc) return
    setPrice(String(svc.price || ""))
    setDurationHours(String(svc.duration_hours || 1))
    setDurationMins(String(svc.duration_minutes || 0))
    if (svc.employee_id) setEmployeeId(svc.employee_id)
    if (svc.location_id) setLocationId(svc.location_id)
  }

  function handleCustomerChange(id: string) {
    setCustomerId(id)
    const cust = customers.find((c) => c.id === id)
    if (!cust) return
    setCustPhone(cust.phone || "")
    setCustEmail(cust.email || "")
    setSmsConsent(cust.sms_consent)
    setEmailConsent(cust.email_consent)
    setWhatsappConsent(cust.whatsapp_consent)
  }

  function calcEndTime() {
    const startMins = timeToMins(startTime)
    const dur = Number(durationHours) * 60 + Number(durationMins)
    return minsToTime(startMins + (dur || 60))
  }

  function handleClose() {
    setStep(1); setServiceId(""); setEmployeeId(""); setLocationId("")
    setCustomerId(""); setCustPhone(""); setCustEmail(""); setError("")
    setPrice(""); setDiscount(""); setShowDiscount(false)
    setDurationHours("1"); setDurationMins("0")
    setAppointmentDate(defaultDate || format(new Date(), "yyyy-MM-dd"))
    setStartTime(workStart || "09:00")
    setExtraServices([]); setApptNotes({}); setShowNoteIdx(null)
    setActiveExtraUid(null)
    onClose()
  }

  // ── Conflict check + go to step 3 ──────────────────────────────────────────
  async function goToStep3() {
    const endTime = calcEndTime()
    const allSlots = [
      { date: appointmentDate, start: startTime, end: endTime, employeeId, locationId },
      ...extraServices.filter((es) => es.serviceId).map((es) => {
        const dur = Number(es.durationHours) * 60 + Number(es.durationMins)
        const sTime = es.time || startTime
        const [sh, sm] = sTime.split(":").map(Number)
        const eMins = sh * 60 + sm + (dur || 60)
        const eTime = `${String(Math.floor(eMins / 60) % 24).padStart(2, "0")}:${String(eMins % 60).padStart(2, "0")}`
        return { date: es.date || appointmentDate, start: sTime, end: eTime, employeeId: es.employeeId, locationId: es.locationId }
      }),
    ]

    let hasConflict = false
    for (const slot of allSlots) {
      if (!slot.date || !slot.start || !slot.end) continue
      const { data: existing } = await supabase
        .from("appointments")
        .select("id,start_time,end_time,employee_id,location_id")
        .eq("appointment_date", slot.date)
        .neq("status", "iptal")
      for (const ex of (existing || [])) {
        const overlap = slot.start < ex.end_time && slot.end > ex.start_time
        if (!overlap) continue
        if (slot.employeeId && ex.employee_id === slot.employeeId) { hasConflict = true; break }
        if (slot.locationId && ex.location_id === slot.locationId) { hasConflict = true; break }
      }
      if (hasConflict) break
    }

    if (hasConflict) { setShowConflictWarn(true) } else { setStep(3) }
  }

  async function handleConfirm() {
    if (!appointmentDate || !startTime) { setError("Tarih ve saat zorunludur."); return }
    setError(""); setSaving(true)

    const endTime = calcEndTime()
    const baseRecord = {
      company_id: companyId || DEMO_COMPANY_ID,
      customer_id: customerId || null,
      appointment_date: appointmentDate,
      status: "onaylandi",
      discount: discount ? Number(discount) : 0,
    }

    // Build all records: main + extra services
    const extraFilled = extraServices.filter((s) => s.serviceId)
    const records = [
      {
        ...baseRecord,
        service_id: serviceId || null,
        employee_id: employeeId || null,
        location_id: locationId || null,
        start_time: startTime,
        end_time: endTime,
        price: price ? Number(price) : null,
        notes: apptNotes[0] || null,
      },
      ...extraFilled.map((s, idx) => {
        const svc = services.find((sv) => sv.id === s.serviceId)
        const dur = Number(s.durationHours) * 60 + Number(s.durationMins)
        const sTime = s.time || startTime
        const [sh, sm] = sTime.split(":").map(Number)
        const eMins = sh * 60 + sm + (dur || 60)
        const eTime = `${String(Math.floor(eMins / 60) % 24).padStart(2, "0")}:${String(eMins % 60).padStart(2, "0")}`
        return {
          ...baseRecord,
          appointment_date: s.date || appointmentDate,
          service_id: s.serviceId,
          employee_id: s.employeeId || null,
          location_id: s.locationId || null,
          start_time: sTime,
          end_time: eTime,
          price: s.price ? Number(s.price) : (svc?.price ? svc.price : null),
          notes: apptNotes[idx + 1] || null,
        }
      }),
    ]

    const { error: sbError } = await supabase.from("appointments").insert(records)

    setSaving(false)
    if (sbError) { setError(sbError.message); return }

    // Auto notification: appointment created (SMS + Email + WhatsApp)
    const custForNotif = customers.find((c) => c.id === customerId)
    if (custForNotif?.phone && companyId) {
      fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          templateKey: "randevu-onayi",
          customerId,
          customerName: custForNotif.full_name || "",
          customerPhone: custForNotif.phone.replace(/\+/g, ""),
          customerEmail: custForNotif.email || null,
          params: {
            appointment_starting_at_date: appointmentDate ? format(parseISO(appointmentDate), "dd.MM.yyyy") : "",
            appointment_starting_at_time: startTime,
            service_title: selectedService?.name || "",
          },
        }),
      }).catch(() => {})
    }

    onSaved()
    handleClose()
  }

  const selectedService  = services.find((s) => s.id === serviceId)
  const selectedEmployee = employees.find((e) => e.id === employeeId)
  const selectedLocation = locations.find((l) => l.id === locationId)
  const selectedCustomer = customers.find((c) => c.id === customerId)
  const endTime = calcEndTime()

  const sidebarInfo = selectedService ? {
    name: selectedService.name,
    employee: selectedEmployee?.full_name || "",
    location: selectedLocation?.name || "",
    date: appointmentDate ? format(parseISO(appointmentDate), "dd.MM.yyyy") : "",
    start: startTime,
    end: endTime,
  } : undefined

  const extraSvcInfos = extraServices
    .filter((es) => es.serviceId)
    .map((es) => {
      const svc = services.find((s) => s.id === es.serviceId)
      const emp = employees.find((e) => e.id === es.employeeId)
      const loc = locations.find((l) => l.id === es.locationId)
      const dur = Number(es.durationHours) * 60 + Number(es.durationMins)
      const [sh, sm] = startTime.split(":").map(Number)
      const eMins = sh * 60 + sm + (dur || 60)
      const eTime = `${String(Math.floor(eMins / 60) % 24).padStart(2,"0")}:${String(eMins % 60).padStart(2,"0")}`
      return {
        uid: es.uid,
        name: svc?.name || "",
        employee: emp?.full_name || "",
        location: loc?.name || "",
        date: appointmentDate ? format(parseISO(appointmentDate), "dd.MM.yyyy") : "",
        start: startTime,
        end: eTime,
      }
    })

  return (
    <>
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <div className="flex">
          {/* Left sidebar */}
          <StepSidebar
            step={step}
            serviceInfo={sidebarInfo}
            extraSvcInfos={extraSvcInfos}
            onRemoveExtra={removeExtraService}
            customerName={selectedCustomer?.full_name}
          />

          {/* Right content */}
          <div className="flex-1 p-6 min-h-[460px] flex flex-col">
            <div className="mb-5">
              <h2 className="text-base font-semibold text-slate-800">Yeni Randevu</h2>
            </div>

            {error && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">{error}</div>
            )}

            {/* ── Step 1 ── */}
            {step === 1 && (
              <div className="flex-1 space-y-4">
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">Hizmet Adı</Label>
                  <Select value={serviceId} onValueChange={handleServiceChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Hizmet Adı" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.length === 0 ? (
                        <SelectItem value="_" disabled>Henüz hizmet yok</SelectItem>
                      ) : services.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {serviceId && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-slate-500 mb-1 block">Çalışan</Label>
                      <Select value={employeeId} onValueChange={setEmployeeId}>
                        <SelectTrigger><SelectValue placeholder="Çalışan" /></SelectTrigger>
                        <SelectContent>
                          {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500 mb-1 block">Hizmet Yeri</Label>
                      <div className="relative">
                        <Select value={locationId} onValueChange={setLocationId}>
                          <SelectTrigger><SelectValue placeholder="Hizmet Yeri" /></SelectTrigger>
                          <SelectContent>
                            {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        {locationId && (
                          <button onClick={() => setLocationId("")} className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 z-10">
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500 mb-1 block">Süre</Label>
                      <div className="flex gap-2">
                        <Select value={durationHours} onValueChange={setDurationHours}>
                          <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[0,1,2,3,4,5,6].map((h) => <SelectItem key={h} value={String(h)}>{h} Saat</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Select value={durationMins} onValueChange={setDurationMins}>
                          <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[0,15,30,45].map((m) => <SelectItem key={m} value={String(m)}>{m} daki...</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block">Randevu Tarihi</Label>
                    <DateInput
                      value={appointmentDate}
                      onChange={setAppointmentDate}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block">Randevu Saati</Label>
                    <Select value={startTime} onValueChange={setStartTime}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {getWorkingTimeOptions(mainWin.start, mainWin.end).map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                        <SelectItem value="__sep__" disabled>── سایر ساعات ──</SelectItem>
                        {ALL_TIME_OPTIONS.filter((t) => {
                          const m = timeToMins(t)
                          return m < timeToMins(mainWin.start) || m > timeToMins(mainWin.end)
                        }).map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block">Hizmet Ücreti</Label>
                    <div className="flex items-center border border-slate-200 rounded-md px-3 h-9 bg-white">
                      <span className="text-slate-400 mr-2 text-sm">₺</span>
                      <input
                        className="flex-1 text-sm outline-none"
                        placeholder="Hizmet Ücreti"
                        type="number"
                        min="0"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block">Tekrar</Label>
                    <Select value={recurrence} onValueChange={setRecurrence}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Tekrarlanmaz</SelectItem>
                        <SelectItem value="daily">Her gün</SelectItem>
                        <SelectItem value="weekly">Her hafta</SelectItem>
                        <SelectItem value="monthly">Her ay</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {showDiscount && (
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block">İndirim (₺)</Label>
                    <Input type="number" min="0" placeholder="0.00" value={discount} onChange={(e) => setDiscount(e.target.value)} />
                  </div>
                )}

                {/* ── Extra service rows ── */}
                <div className={extraServices.length > 2 ? "max-h-64 overflow-y-auto space-y-2 pr-0.5" : "space-y-2"}>
                {extraServices.map((es) => {
                  const isActive = activeExtraUid === es.uid
                  const svcName  = services.find((s) => s.id === es.serviceId)?.name
                  const empName  = employees.find((e) => e.id === es.employeeId)?.full_name
                  const locName  = locations.find((l) => l.id === es.locationId)?.name
                  const extraWin = workWindow(es.employeeId, es.date || appointmentDate)

                  // ── Collapsed summary ──────────────────────────────────────
                  if (!isActive) return (
                    <div
                      key={es.uid}
                      className="flex items-center justify-between border border-blue-100 rounded-lg px-3 py-2 bg-blue-50/40 cursor-pointer hover:bg-blue-50 transition-colors"
                      onClick={() => setActiveExtraUid(es.uid)}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-blue-700 truncate">{svcName || "Hizmet seçilmedi"}</p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {[empName, locName, es.date, es.time].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        <ChevronDown className="h-3.5 w-3.5 text-slate-400 -rotate-90" />
                        <button
                          onClick={(e) => { e.stopPropagation(); removeExtraService(es.uid) }}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )

                  // ── Expanded form ──────────────────────────────────────────
                  return (
                  <div key={es.uid} className="border border-blue-200 rounded-lg p-3 space-y-3 bg-blue-50/40">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setActiveExtraUid(null)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-blue-700"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                        {svcName || "Ek Hizmet"}
                      </button>
                      <button
                        onClick={() => removeExtraService(es.uid)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Service select */}
                    <div>
                      <Label className="text-xs text-slate-500 mb-1 block">Hizmet Adı</Label>
                      <Select value={es.serviceId} onValueChange={(v) => updateExtraService(es.uid, "serviceId", v)}>
                        <SelectTrigger className="bg-white"><SelectValue placeholder="Hizmet seçin" /></SelectTrigger>
                        <SelectContent>
                          {services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {es.serviceId && (
                      <>
                        {/* Çalışan + Hizmet Yeri */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-slate-500 mb-1 block">Çalışan</Label>
                            <Select value={es.employeeId} onValueChange={(v) => updateExtraService(es.uid, "employeeId", v)}>
                              <SelectTrigger className="bg-white"><SelectValue placeholder="Çalışan" /></SelectTrigger>
                              <SelectContent>
                                {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs text-slate-500 mb-1 block">Hizmet Yeri</Label>
                            <Select value={es.locationId} onValueChange={(v) => updateExtraService(es.uid, "locationId", v)}>
                              <SelectTrigger className="bg-white"><SelectValue placeholder="Hizmet Yeri" /></SelectTrigger>
                              <SelectContent>
                                {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Tarih + Randevu Saati */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-slate-500 mb-1 block">Tarih</Label>
                            <DateInput value={es.date} onChange={(v) => updateExtraService(es.uid, "date", v)} />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-500 mb-1 block">Randevu Saati</Label>
                            <Select value={es.time} onValueChange={(v) => updateExtraService(es.uid, "time", v)}>
                              <SelectTrigger className="bg-white"><SelectValue placeholder="Saat" /></SelectTrigger>
                              <SelectContent className="max-h-48">
                                {getWorkingTimeOptions(extraWin.start, extraWin.end).map((t) => (
                                  <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                                <SelectItem value="__sep__" disabled>── Diğer ──</SelectItem>
                                {ALL_TIME_OPTIONS.filter((t) => {
                                  const m = timeToMins(t)
                                  return m < timeToMins(extraWin.start) || m > timeToMins(extraWin.end)
                                }).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Hizmet Ücreti - read only */}
                        <div>
                          <Label className="text-xs text-slate-500 mb-1 block">Hizmet Ücreti</Label>
                          <div className="flex items-center bg-blue-50 border border-blue-200 rounded-md px-3 h-9">
                            <span className="text-blue-400 mr-1 text-sm">₺</span>
                            <span className="flex-1 text-sm font-semibold text-blue-700 select-none">
                              {es.price ? Number(es.price).toLocaleString("tr-TR") : "—"}
                            </span>
                            <span className="text-[10px] text-blue-400 ml-1">otomatik</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  )
                })}
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button onClick={() => setShowDiscount(!showDiscount)} className="text-blue-600 hover:underline">İndirim Ekle %</button>
                  <button onClick={addExtraService} className="text-blue-600 hover:underline font-medium">Yeni bir hizmet daha ekle +</button>
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={() => {
                    const today = format(new Date(), "yyyy-MM-dd")
                    if (appointmentDate < today) {
                      setShowPastWarn(true)
                    } else {
                      setStep(2)
                    }
                  }}>Devam Et</Button>
                </div>
              </div>
            )}

            {/* ── Step 2 ── */}
            {step === 2 && (
              <div className="flex-1 space-y-4">
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">Müşteri Adı</Label>
                  <Select value={customerId} onValueChange={handleCustomerChange}>
                    <SelectTrigger><SelectValue placeholder="Müşteri Adı" /></SelectTrigger>
                    <SelectContent>
                      {customers.length === 0 ? (
                        <SelectItem value="_" disabled>Henüz müşteri yok</SelectItem>
                      ) : customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <div className="w-24">
                    <Select defaultValue="90">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="90">+90</SelectItem>
                        <SelectItem value="1">+1</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    className="flex-1"
                    placeholder="Müşteri telefon numarası"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                  />
                </div>

                <Input
                  placeholder="Müşteri e-posta adresi"
                  type="email"
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                />

                <NotificationSection
                  smsConsent={smsConsent}
                  emailConsent={emailConsent}
                  whatsappConsent={whatsappConsent}
                  onSmsChange={setSmsConsent}
                  onEmailChange={setEmailConsent}
                  onWhatsappChange={setWhatsappConsent}
                />

                <div className="flex items-center justify-between pt-2">
                  <button onClick={() => setStep(1)} className="text-xs text-blue-600 hover:underline">Geri</button>
                  <Button onClick={goToStep3} disabled={!customerId}>Devam Et</Button>
                </div>
              </div>
            )}

            {/* ── Step 3 ── */}
            {step === 3 && (() => {
              // Build a unified list of all appointments for summary
              const allSummary = [
                {
                  idx: 0,
                  svcName: selectedService?.name || "-",
                  empName: selectedEmployee?.full_name || "",
                  locName: selectedLocation?.name || "",
                  date: appointmentDate ? format(parseISO(appointmentDate), "dd.MM.yyyy") : "",
                  start: startTime,
                  end: endTime,
                  durH: Number(durationHours),
                  durM: Number(durationMins),
                  price: Number(price || 0),
                  disc: Number(discount || 0),
                },
                ...extraServices.filter((es) => es.serviceId).map((es, i) => {
                  const svc = services.find((s) => s.id === es.serviceId)
                  const emp = employees.find((e) => e.id === es.employeeId)
                  const loc = locations.find((l) => l.id === es.locationId)
                  const durH = Number(es.durationHours); const durM = Number(es.durationMins)
                  const dur = durH * 60 + durM
                  const sTime = es.time || startTime
                  const [sh, sm] = sTime.split(":").map(Number)
                  const eMins = sh * 60 + sm + (dur || 60)
                  const eTime = `${String(Math.floor(eMins / 60) % 24).padStart(2, "0")}:${String(eMins % 60).padStart(2, "0")}`
                  return {
                    idx: i + 1,
                    svcName: svc?.name || "-",
                    empName: emp?.full_name || "",
                    locName: loc?.name || "",
                    date: es.date ? format(parseISO(es.date), "dd.MM.yyyy") : "",
                    start: sTime,
                    end: eTime,
                    durH, durM,
                    price: Number(es.price || 0),
                    disc: 0,
                  }
                }),
              ]
              return (
                <div className="flex-1 flex flex-col">
                  <div className="flex-1 overflow-y-auto space-y-3 pr-0.5">
                    {allSummary.map((a) => (
                      <div key={a.idx} className="border border-slate-200 rounded-xl p-4 text-sm">
                        <p className="text-xs font-bold text-slate-700 mb-2">{a.idx + 1}. Randevu Detay</p>
                        {/* Row 1: customer + price */}
                        <div className="flex justify-between items-start">
                          <span className="text-slate-700 font-medium">{selectedCustomer?.full_name || "—"}</span>
                          <span className="font-semibold text-slate-800">₺{a.price.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
                        </div>
                        {/* Row 2: discount */}
                        <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                          <span>{a.empName}</span>
                          <span>İndirim ₺{a.disc.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
                        </div>
                        {/* Row 3: location + total */}
                        {a.locName && (
                          <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                            <span>{a.locName}</span>
                            <span>Toplam ₺{(a.price - a.disc).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        {/* Row 4: date-time + duration */}
                        <div className="flex justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
                          <span>{a.date}, {a.start} - {a.end}</span>
                          <span>{a.durH} Saat {a.durM} dakika</span>
                        </div>
                        {/* Note */}
                        {showNoteIdx === a.idx ? (
                          <textarea
                            autoFocus
                            className="mt-2 w-full text-xs border border-slate-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                            rows={2}
                            placeholder="Not yazın..."
                            value={apptNotes[a.idx] || ""}
                            onChange={(e) => setApptNotes((prev) => ({ ...prev, [a.idx]: e.target.value }))}
                          />
                        ) : (
                          <button
                            onClick={() => setShowNoteIdx(a.idx)}
                            className="mt-2 text-xs text-orange-500 hover:underline"
                          >
                            {apptNotes[a.idx] ? `Not: ${apptNotes[a.idx]}` : "Not ekle"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between pt-4 border-t border-slate-100 mt-3">
                    <Button variant="outline" onClick={() => setStep(2)} disabled={saving}>Geri</Button>
                    <Button onClick={handleConfirm} disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Onayla
                    </Button>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      </DialogContent>

    </Dialog>

    {/* ── Conflict warning dialog ── */}
    <Dialog open={showConflictWarn} onOpenChange={setShowConflictWarn}>
      <DialogContent className="max-w-[380px] p-0 overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-800">Kesişen Randevu</h3>
        </div>
        <div className="px-5 py-5 text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-amber-400 flex items-center justify-center shadow-lg">
              <AlertCircle className="h-8 w-8 text-white" />
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-left">
            <p className="text-xs text-amber-700 leading-relaxed">
              • Seçilen çalışan veya hizmet yeri bu saatte başka bir randevuya sahip.
              Yine de devam etmek istiyor musunuz?
            </p>
          </div>
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={() => setShowConflictWarn(false)}
            className="flex-1 h-10 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Vazgeç
          </button>
          <button
            onClick={() => { setShowConflictWarn(false); setStep(3) }}
            className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors"
          >
            Devam Et
          </button>
        </div>
      </DialogContent>
    </Dialog>

    {/* ── Past date warning dialog ── */}
    <Dialog open={showPastWarn} onOpenChange={(v) => { if (!v) { setShowPastWarn(false); handleClose() } }}>
      <DialogContent className="max-w-[380px] p-0 overflow-hidden rounded-2xl">
        {/* Title bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-800">Kesişen Randevu</h3>
        </div>
        <div className="px-5 py-5 text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-amber-400 flex items-center justify-center shadow-lg">
              <AlertCircle className="h-8 w-8 text-white" />
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-left">
            <p className="text-xs text-amber-700 leading-relaxed">
              • Başlangıç tarihi değeri Bugün tarihinden sonra veya eşit olmalıdır.
            </p>
          </div>
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={() => { setShowPastWarn(false); handleClose() }}
            className="flex-1 h-10 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Vazgeç
          </button>
          <button
            onClick={() => { setShowPastWarn(false); setStep(2) }}
            className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors"
          >
            Devam Et
          </button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}

// ── Status helpers ─────────────────────────────────────────────────────────
// cardBg  = hex used for appointment card backgrounds on the calendar grid
// badgeCls = Tailwind classes used for status badge/select in popups
const STATUS_OPTIONS = [
  { value: "beklemede",  label: "Beklemede",  badgeCls: "bg-amber-100 text-amber-700 border-amber-300",     cardBg: "#f59e0b" },
  { value: "onaylandi",  label: "Onaylandı",  badgeCls: "bg-blue-100 text-blue-700 border-blue-300",        cardBg: "#2563eb" },
  { value: "tamamlandi", label: "Tamamlandı", badgeCls: "bg-emerald-100 text-emerald-700 border-emerald-300", cardBg: "#059669" },
  { value: "iptal",      label: "İptal",      badgeCls: "bg-slate-200 text-slate-600 border-slate-300",   cardBg: "#94a3b8" },
]
function statusColor(s: string) {
  return STATUS_OPTIONS.find((o) => o.value === s)?.badgeCls || "bg-slate-100 text-slate-600"
}
function statusLabel(s: string) {
  return STATUS_OPTIONS.find((o) => o.value === s)?.label || s
}
function statusCardBg(s: string) {
  return STATUS_OPTIONS.find((o) => o.value === s)?.cardBg || "#1e3a8a"
}

// ── Appointment Popup Card ─────────────────────────────────────────────────
function AppointmentPopup({
  app, pos, onClose, onDetailOpen, onPaymentOpen, onDelete, onStatusChange,
}: {
  app: DbAppointment
  pos: { x: number; y: number }
  onClose: () => void
  onDetailOpen: () => void
  onPaymentOpen: () => void
  onDelete: () => void
  onStatusChange: (s: string) => void
}) {
  const dateStr = (() => {
    try {
      const d = parseISO(app.appointment_date)
      return format(d, "d MMMM, EEE", { locale: tr })
    } catch { return app.appointment_date }
  })()
  const durH = app.services?.duration_hours ?? 0
  const durM = app.services?.duration_minutes ?? 0
  const durLabel = durH > 0 ? `${durH} Saat${durM > 0 ? ` ${durM} dk` : ""}` : durM > 0 ? `${durM} dk` : ""

  // Compute popup position (keep inside viewport)
  const POPUP_W = 280, POPUP_H = 300
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200
  const vh = typeof window !== "undefined" ? window.innerHeight : 800
  const left = Math.min(pos.x + 10, vw - POPUP_W - 16)
  const top  = Math.min(pos.y - 10, vh - POPUP_H - 16)

  return (
    <div
      className="fixed z-50 bg-white rounded-xl shadow-2xl border border-slate-200 w-[280px] overflow-hidden"
      style={{ left, top }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-end gap-1 px-3 pt-3 pb-1">
        <button className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors" title="Düzenle" onClick={onDetailOpen}>
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-red-600 transition-colors" title="Sil" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <button className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 transition-colors" title="Kapat" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 pb-3 space-y-2">
        {/* Customer */}
        <div className="flex items-center gap-2">
          {/* Avatar: status color bg + employee color ring */}
          <div
            className="w-8 h-8 rounded-md shrink-0 flex items-center justify-center text-white text-xs font-bold ring-2"
            style={{
              backgroundColor: statusCardBg(app.status),
              boxShadow: app.employees?.color ? `0 0 0 2px ${app.employees.color}` : undefined,
            }}
          >
            {(app.customers?.full_name || "?")[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 leading-tight">{app.customers?.full_name || "Müşteri"}</p>
            {app.customers?.phone && (
              <p className="text-xs text-slate-400">{app.customers.phone}</p>
            )}
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            {app.employees?.color && (
              <span className="w-2.5 h-2.5 rounded-full border border-white/60" style={{ backgroundColor: app.employees.color }} title={app.employees.full_name} />
            )}
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
          </div>
        </div>

        {/* Date / time */}
        <div className="flex items-start gap-2 text-xs text-slate-600">
          <Calendar className="h-3.5 w-3.5 mt-0.5 text-slate-400 shrink-0" />
          <span>{dateStr} • {app.start_time.slice(0,5)} - {app.end_time.slice(0,5)}{durLabel ? ` • ${durLabel}` : ""}</span>
        </div>

        {/* Service */}
        {app.services?.name && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>{app.services.name}</span>
          </div>
        )}

        {/* Location */}
        {app.service_locations?.name && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>{app.service_locations.name}</span>
          </div>
        )}

        {/* Payment status */}
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <CreditCard className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className={cn("px-2 py-0.5 rounded-full border text-xs font-medium", app.price ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-100 text-slate-500 border-slate-200")}>
            {app.price ? `₺${app.price.toLocaleString("tr-TR")}` : "Ödenmedi"}
          </span>
        </div>

        {/* Detail link */}
        <button onClick={onDetailOpen} className="text-xs text-blue-600 hover:underline font-medium">
          Randevu detayına git →
        </button>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-100 bg-slate-50">
        <select
          value={app.status}
          onChange={(e) => onStatusChange(e.target.value)}
          className={cn("flex-1 text-xs font-medium px-2 py-1.5 rounded-lg border cursor-pointer outline-none", statusColor(app.status))}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button
          onClick={onPaymentOpen}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          Ödeme Ekle
        </button>
      </div>
    </div>
  )
}

// ── Detail Side Panel ──────────────────────────────────────────────────────
function DetailPanel({
  app, onClose, onDeleted, onPaymentOpen,
}: {
  app: DbAppointment
  onClose: () => void
  onDeleted: () => void
  onPaymentOpen: () => void
}) {
  const { companyId } = useCompany()
  const cid = companyId || DEMO_COMPANY_ID
  const [editMode, setEditMode] = useState(false)
  const [status,   setStatus]   = useState(app.status)
  const [deleting, setDel]      = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [notify,   setNotify]   = useState(false)

  // Edit form state
  const [services,   setServices]   = useState<{id:string;name:string}[]>([])
  const [employees,  setEmployees]  = useState<{id:string;full_name:string}[]>([])
  const [locations,  setLocations]  = useState<{id:string;name:string}[]>([])
  const [serviceId,  setServiceId]  = useState("")
  const [employeeId, setEmployeeId] = useState("")
  const [locationId, setLocationId] = useState("")
  const [durH,       setDurH]       = useState(String(app.services?.duration_hours ?? 1))
  const [durM,       setDurM]       = useState(String(app.services?.duration_minutes ?? 0))
  const [price,      setPrice]      = useState(app.price ? String(app.price) : "")
  const [date,       setDate]       = useState(app.appointment_date)
  const [time,       setTime]       = useState(app.start_time.slice(0,5))
  const [note,       setNote]       = useState(app.notes || "")

  useEffect(() => {
    if (!editMode) return
    Promise.all([
      supabase.from("services").select("id,name").order("name"),
      supabase.from("employees").select("id,full_name").eq("status","active").order("full_name"),
      supabase.from("service_locations").select("id,name").order("name"),
    ]).then(([{ data: s }, { data: e }, { data: l }]) => {
      setServices(s || [])
      setEmployees(e || [])
      setLocations(l || [])
    })
  }, [editMode])

  async function handleDelete() {
    if (!confirm("Bu randevuyu silmek istediğinizden emin misiniz?")) return
    setDel(true)
    await supabase.from("appointments").delete().eq("id", app.id)
    setDel(false); onDeleted(); onClose()
  }

  async function handleStatusChange(s: string) {
    setStatus(s)
    await supabase.from("appointments").update({ status: s }).eq("id", app.id)
    if (s === "completed") {
      const { error: finErr } = await maybeRecordIncomeOnAppointmentCompleted(supabase, {
        companyId: cid,
        appointmentId: app.id,
        price: app.price,
        customerName: app.customers?.full_name ?? null,
      })
      if (finErr) console.warn("[finance] randevu tamamlandı:", finErr.message)
      if (app.customers?.id) {
        sendUsageSmsOnCompletion(supabase, {
          companyId: cid,
          customerId: app.customers.id,
          customerName: app.customers.full_name || "",
          customerPhone: app.customers.phone,
          serviceId: app.service_id ?? null,
        }).catch(() => {})
      }
    }
    if (s === "iptal" && app.customers?.phone) {
      fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: cid,
          templateKey: "randevu-iptali",
          customerId: app.customers.id,
          customerName: app.customers.full_name || "",
          customerPhone: (app.customers.phone as string).replace(/\+/g, ""),
          customerEmail: (app.customers as Record<string, unknown>).email || null,
          params: {
            appointment_starting_at_date: app.appointment_date ? format(parseISO(app.appointment_date), "dd.MM.yyyy") : "",
            appointment_starting_at_time: app.start_time?.slice(0, 5) || "",
          },
        }),
      }).catch(() => {})
    }
  }

  async function handleSave() {
    setSaving(true)
    const [sh, sm] = time.split(":").map(Number)
    const endMins = sh * 60 + sm + Number(durH) * 60 + Number(durM)
    const endTime = `${String(Math.floor(endMins / 60) % 24).padStart(2,"0")}:${String(endMins % 60).padStart(2,"0")}:00`
    await supabase.from("appointments").update({
      ...(serviceId  && { service_id:  serviceId  }),
      ...(employeeId && { employee_id: employeeId }),
      location_id: locationId || null,
      appointment_date: date,
      start_time: time + ":00",
      end_time: endTime,
      price: price ? Number(price) : null,
      notes: note || null,
      status,
    }).eq("id", app.id)

    if (notify && app.customers?.phone && (date !== app.appointment_date || time + ":00" !== app.start_time)) {
      fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: cid,
          templateKey: "randevu-guncelleme",
          customerId: app.customers.id,
          customerName: app.customers.full_name || "",
          customerPhone: (app.customers.phone as string).replace(/\+/g, ""),
          customerEmail: (app.customers as Record<string, unknown>).email || null,
          params: {
            appointment_starting_at_date: date ? format(parseISO(date), "dd.MM.yyyy") : "",
            appointment_starting_at_time: time,
          },
        }),
      }).catch(() => {})
    }

    setSaving(false); onDeleted(); onClose()
  }

  const dateStr = (() => {
    try { return format(parseISO(app.appointment_date), "dd.MM.yyyy") } catch { return app.appointment_date }
  })()

  // ── READ VIEW ──────────────────────────────────────────────────────────────
  if (!editMode) return (
    <div className="w-full h-full border-l border-slate-200 bg-white flex flex-col">
      <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200">
        <div>
          <p className="text-xs font-semibold text-slate-700">Randevu detay</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Randevunuz ile ilgili değişiklikten yapabilirsiniz.</p>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-400"><X className="h-4 w-4" /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-base font-bold text-slate-800">{app.customers?.full_name || "Müşteri"}</p>
            {app.customers?.phone && <p className="text-xs text-slate-500 mt-0.5">{app.customers.phone}</p>}
            <button className="text-xs text-blue-600 hover:underline mt-1">Müşteri bilgilerini düzenle</button>
          </div>
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className={cn("text-xs font-semibold px-3 py-1.5 rounded-lg border cursor-pointer outline-none", statusColor(status))}
          >
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {app.price != null && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-xl font-bold text-slate-800">₺{app.price.toLocaleString("tr-TR")},00</span>
            <button onClick={onPaymentOpen} className="text-xs text-blue-600 hover:underline font-medium">Ödemeye git →</button>
          </div>
        )}

        <div className="border-t border-slate-100" />

        {[
          { label: "Hizmet",       value: app.services?.name },
          { label: "Çalışan",      value: app.employees?.full_name },
          { label: "Tarih",        value: dateStr },
          { label: "Saat",         value: app.start_time.slice(0,5) },
          { label: "Hizmet alanı", value: app.service_locations?.name },
          { label: "Süre",         value: app.services ? `${app.services.duration_hours || 0} Saat${app.services.duration_minutes ? ` ${app.services.duration_minutes} dk` : ""}` : "—" },
          { label: "Randevu Notu", value: app.notes },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-start justify-between py-2 border-b border-slate-50 last:border-0">
            <span className="text-xs text-slate-500 w-28 shrink-0">{label}</span>
            <span className="text-xs text-slate-800 font-medium text-right flex-1">{value || "—"}</span>
          </div>
        ))}

        <button onClick={() => setEditMode(true)} className="text-xs text-blue-600 hover:underline font-medium">
          Randevu detayını düzenle →
        </button>
      </div>

      <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200">
        <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-medium">
          <Trash2 className="h-3.5 w-3.5" />
          {deleting ? "Siliniyor…" : "Başvuruyu sil"}
          {!deleting && <span className="text-red-400">🗑</span>}
        </button>
        <button onClick={onClose} className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-5 py-2 rounded-lg transition-colors">
          Kapat
        </button>
      </div>
    </div>
  )

  // ── EDIT VIEW ──────────────────────────────────────────────────────────────
  const TIME_OPTS = Array.from({ length: 96 }, (_, i) => {
    const h = Math.floor(i / 4), m = (i % 4) * 15
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`
  })

  return (
    <div className="w-full h-full border-l border-slate-200 bg-white flex flex-col">
      <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200">
        <div>
          <p className="text-xs font-semibold text-slate-700">Randevu detay</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Randevunuz ile ilgili değişiklikten yapabilirsiniz.</p>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-400"><X className="h-4 w-4" /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {/* Customer */}
        <div>
          <p className="text-base font-bold text-slate-800">{app.customers?.full_name || "Müşteri"}</p>
          {app.customers?.phone && <p className="text-xs text-slate-500">{app.customers.phone}</p>}
        </div>

        {/* Hizmet + Çalışan */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-slate-500 font-medium block mb-1.5">Hizmet</label>
            <select value={serviceId} onChange={(e) => setServiceId(e.target.value)}
              className="w-full h-9 border border-slate-200 rounded-md px-2 text-sm outline-none bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100">
              <option value="">{app.services?.name || "Seçin"}</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-slate-500 font-medium block mb-1.5">Çalışan</label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full h-9 border border-slate-200 rounded-md px-2 text-sm outline-none bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100">
              <option value="">{app.employees?.full_name || "Seçin"}</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          </div>
        </div>

        {/* Hizmet yeri + Süresi */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-slate-500 font-medium block mb-1.5">Hizmet yeri</label>
            <div className="relative flex items-center border border-slate-200 rounded-md h-9 bg-white focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-100">
              <select value={locationId} onChange={(e) => setLocationId(e.target.value)}
                className="flex-1 h-full px-2 text-sm outline-none bg-transparent pr-6">
                <option value="">{app.service_locations?.name || "Seçin"}</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              {locationId && (
                <button onClick={() => setLocationId("")} className="absolute right-1.5 text-slate-400 hover:text-slate-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="text-[11px] text-slate-500 font-medium block mb-1.5">Süresi</label>
            <div className="grid grid-cols-2 gap-1.5">
              <select value={durH} onChange={(e) => setDurH(e.target.value)}
                className="h-9 border border-slate-200 rounded-md px-1.5 text-sm outline-none bg-white">
                {Array.from({length:13},(_,i)=>i).map((h)=>(
                  <option key={h} value={h}>{h} Saat</option>
                ))}
              </select>
              <select value={durM} onChange={(e) => setDurM(e.target.value)}
                className="h-9 border border-slate-200 rounded-md px-1.5 text-sm outline-none bg-white">
                {["0","15","30","45"].map((m)=>(
                  <option key={m} value={m}>{m} dakika</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Hizmet Ücreti */}
        <div>
          <label className="text-[11px] text-slate-500 font-medium block mb-1.5">Hizmet Ücreti (KDV Dahil)</label>
          <div className="flex items-center border border-slate-200 rounded-md h-9 px-3 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-100 bg-white">
            <span className="text-sm text-slate-400 mr-1">₺</span>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className="flex-1 text-sm outline-none bg-transparent"
            />
          </div>
        </div>

        {/* Tarih + Randevu saati */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-slate-500 font-medium block mb-1.5">Tarih</label>
            <DateInput value={date} onChange={setDate} />
          </div>
          <div>
            <label className="text-[11px] text-slate-500 font-medium block mb-1.5">Randevu saati</label>
            <select value={time} onChange={(e) => setTime(e.target.value)}
              className="w-full h-9 border border-slate-200 rounded-md px-2 text-sm outline-none bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100">
              {TIME_OPTS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* Randevu Notu */}
        <div>
          <label className="text-[11px] text-slate-500 font-medium block mb-1.5">Randevu Notu</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Randevu Notu"
            rows={3}
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none bg-white resize-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
          />
        </div>

        {/* Notify toggle */}
        <div className="flex items-center justify-between pt-1 pb-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">🔔</span>
            <span className="text-xs text-slate-600 font-medium">Bu randevudaki değişiklikleri bildir</span>
          </div>
          <Switch checked={notify} onCheckedChange={setNotify} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-slate-200">
        <button onClick={() => setEditMode(false)} className="text-sm text-slate-600 hover:text-slate-800 font-medium px-3 py-2">
          Vazgeç
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-6 py-2 rounded-lg transition-colors"
        >
          {saving ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </div>
    </div>
  )
}

function paymentMethodDbToLabel(m: string | null | undefined) {
  const x = (m ?? "").toLowerCase()
  if (x === "card" || x === "kart" || x === "pos") return "Kart"
  if (x === "transfer" || x === "havale" || x === "online") return "Havale"
  return "Nakit"
}

// ── Payment Side Panel ─────────────────────────────────────────────────────
function PaymentPanel({
  app, onClose, onSaved,
}: {
  app: DbAppointment
  onClose: () => void
  onSaved: () => void
}) {
  const [amount, setAmount]   = useState(app.price ? String(app.price) : "")
  const [method, setMethod]   = useState("nakit")
  const [payDate, setPayDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState<string | null>(null)
  const [payments, setPayments] = useState<
    { id: string; amount: number; paid_at: string | null; method: string | null }[]
  >([])
  const [showHistory, setShowHistory] = useState(false)
  const { companyId } = useCompany()

  useEffect(() => {
    supabase
      .from("payments")
      .select("id, amount, paid_at, method")
      .eq("appointment_id", app.id)
      .order("paid_at", { ascending: false })
      .then(({ data }) =>
        setPayments(
          (data ?? []) as { id: string; amount: number; paid_at: string | null; method: string | null }[]
        )
      )
  }, [app.id])

  async function handleSave() {
    if (!amount) return
    setSaveErr(null)
    setSaving(true)
    const effectiveCompanyId = companyId || DEMO_COMPANY_ID
    const paidAtIso = `${payDate}T12:00:00.000Z`
    const { error: payErr } = await supabase.from("payments").insert({
      appointment_id: app.id,
      customer_id: app.customers?.id,
      company_id: effectiveCompanyId,
      amount: Number(amount),
      method: mapUiPaymentToPaymentsDbMethod(method),
      paid_at: paidAtIso,
    })
    if (payErr) {
      setSaving(false)
      setSaveErr(payErr.message)
      console.warn("[payment] ödeme kaydı:", payErr.message)
      return
    }
    const { error: finErr } = await recordIncomeFromAppointmentPayment(supabase, {
      companyId: effectiveCompanyId,
      appointmentId: app.id,
      amount: Number(amount),
      uiPaymentMethod: method,
      customerName: app.customers?.full_name ?? null,
    })
    setSaving(false)
    if (finErr) {
      setSaveErr(
        `Ödeme kaydedildi; Finans defterine yazılamadı: ${finErr.message}. Admin → Finans için SQL migrasyonlarını çalıştırın.`
      )
      console.warn("[finance] gelir satırı:", finErr.message)
    }
    void supabase
      .from("payments")
      .select("id, amount, paid_at, method")
      .eq("appointment_id", app.id)
      .order("paid_at", { ascending: false })
      .then(({ data }) =>
        setPayments(
          (data ?? []) as { id: string; amount: number; paid_at: string | null; method: string | null }[]
        )
      )
    if (!finErr) {
      onSaved()
      onClose()
    }
  }

  return (
    <div className="w-full h-full border-l border-slate-200 bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200">
        <div>
          <p className="text-xs text-slate-500 mb-0.5">Ödeme ekle</p>
          <p className="text-xs text-slate-400">Oluşturmak istediğiniz alanı seçin ve kurallarını belirleyin</p>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-400"><X className="h-4 w-4" /></button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Service + balance */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">{app.services?.name || "Hizmet"}</p>
          <div className="text-right">
            <p className="text-[10px] text-slate-400">Kalan bakiye</p>
            <p className="text-sm font-bold text-slate-700">₺{app.price ? app.price.toLocaleString("tr-TR") : "0"},00</p>
          </div>
        </div>

        {/* Fields */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] text-slate-500 block mb-1">Ödenecek tutar</label>
            <div className="flex items-center border border-slate-200 rounded-md px-2 h-9 bg-white">
              <span className="text-xs text-slate-400 mr-1">₺</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 text-sm outline-none bg-transparent"
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 block mb-1">Ödeme şekli</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full h-9 border border-slate-200 rounded-md px-2 text-sm outline-none bg-white"
            >
              <option value="nakit">Nakit</option>
              <option value="kart">Kredi Kartı</option>
              <option value="havale">Havale</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 block mb-1">Ödeme tarihi</label>
            <DateInput value={payDate} onChange={setPayDate} />
          </div>
        </div>

        {saveErr && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {saveErr}
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
        >
          {saving ? "Kaydediliyor…" : "Ödemeyi gir"}
        </button>

        {/* Payment history */}
        <div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center justify-between w-full text-xs text-slate-600 font-medium"
          >
            <span>Ödeme geçmişi</span>
            <span className="text-blue-600">{showHistory ? "Gizle ↑" : "Tüm ödemeleri göster ↓"}</span>
          </button>
          {showHistory && (
            <div className="mt-2 space-y-1">
              {payments.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2 text-center">Ödeme geçmişi bulunmamaktadır.</p>
              ) : (
                payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs"
                  >
                    <span className="text-slate-600">
                      {(p.paid_at && format(parseISO(p.paid_at), "dd.MM.yyyy", { locale: tr })) || "—"} •{" "}
                      {paymentMethodDbToLabel(p.method)}
                    </span>
                    <span className="font-semibold text-slate-800">
                      ₺{Number(p.amount).toLocaleString("tr-TR")}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
          {!showHistory && (
            <p className="text-xs text-slate-400 italic mt-2 text-center">Ödeme geçmişi bulunmamaktadır.</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200">
        <button onClick={onClose} className="text-sm text-slate-600 hover:text-slate-800 px-4 py-2">Vazgeç</button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
        >
          {saving ? "…" : "Kaydet"}
        </button>
      </div>
    </div>
  )
}

// ── Mini Calendar (sidebar) ────────────────────────────────────────────────
const MINI_DAY_NAMES = ["Pt","Sa","Ça","Pe","Cu","Ct","Pa"]

function MiniCalendar({
  sidebarMonth, setSidebarMonth, currentDate, setCurrentDate, viewMode,
}: {
  sidebarMonth: Date
  setSidebarMonth: (d: Date) => void
  currentDate: Date
  setCurrentDate: (d: Date) => void
  viewMode: "gunluk"|"haftalik"|"aylik"
}) {
  const mStart   = startOfMonth(sidebarMonth)
  const mEnd     = endOfMonth(sidebarMonth)
  const offset   = (getDay(mStart) + 6) % 7
  const allDays  = eachDayOfInterval({ start: mStart, end: mEnd })
  const cells: (Date|null)[] = [...Array(offset).fill(null), ...allDays]
  while (cells.length % 7 !== 0) cells.push(null)

  // Highlight: for weekly show the whole week, for daily show just currentDate
  const wStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const wEnd   = endOfWeek(currentDate,   { weekStartsOn: 1 })

  function isHighlighted(day: Date) {
    if (viewMode === "gunluk")   return isSameDay(day, currentDate)
    if (viewMode === "haftalik") return day >= wStart && day <= wEnd
    return day.getMonth() === currentDate.getMonth() && day.getFullYear() === currentDate.getFullYear()
  }

  return (
    <div className="bg-[#1a2744] rounded-xl mx-3 mt-3 mb-2 px-3 py-3">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-white capitalize">
          {format(sidebarMonth, "MMMM yyyy", { locale: tr })}
        </span>
        <div className="flex gap-0.5">
          <button
            onClick={() => setSidebarMonth(subMonths(sidebarMonth, 1))}
            className="p-1 rounded hover:bg-white/20 text-white/70 hover:text-white transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setSidebarMonth(addMonths(sidebarMonth, 1))}
            className="p-1 rounded hover:bg-white/20 text-white/70 hover:text-white transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {MINI_DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-[11px] text-white/50 font-semibold py-1">{d}</div>
        ))}
      </div>
      {/* Days */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => (
          <button
            key={i}
            disabled={!day}
            onClick={() => { if (day) { setCurrentDate(day); setSidebarMonth(day) } }}
            className={cn(
              "h-7 w-7 mx-auto rounded-full text-[12px] font-medium flex items-center justify-center transition-all",
              !day ? "invisible" : "",
              day && isToday(day) && !isHighlighted(day)
                ? "ring-2 ring-white text-white font-bold" : "",
              day && isHighlighted(day) && !isToday(day)
                ? "bg-white/25 text-white rounded-md" : "",
              day && isHighlighted(day) && isToday(day)
                ? "bg-white text-[#1a2744] font-bold rounded-full" : "",
              day && !isHighlighted(day) && !isToday(day)
                ? "text-white/75 hover:bg-white/15 hover:text-white" : "",
            )}
          >
            {day ? format(day, "d") : ""}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Main Calendar Page ─────────────────────────────────────────────────────
export default function TakvimPage() {
  const { companyId } = useCompany()
  const cid = companyId || DEMO_COMPANY_ID

  const [currentDate, setCurrentDate]         = useState(new Date())
  const [sidebarMonth, setSidebarMonth]       = useState(new Date())
  const [viewMode, setViewMode]               = useState<"gunluk"|"haftalik"|"aylik">("haftalik")
  const [showSidebar, setShowSidebar]         = useState(false)
  const [showModal, setShowModal]             = useState(false)
  const [showDatePicker, setShowDatePicker]   = useState(false)
  const [clickedDate, setClickedDate]         = useState<string | undefined>()
  const [modalStartTime, setModalStartTime]   = useState<string | undefined>(undefined)
  const [appointments, setAppointments]       = useState<DbAppointment[]>([])
  const [loading, setLoading]                 = useState(true)
  const [workStart, setWorkStart]             = useState("09:00")
  const [workEnd, setWorkEnd]                 = useState("18:00")
  const [whCompany, setWhCompany] = useState<Record<number, WorkDayRow>>({})
  const [whEmp, setWhEmp] = useState<Record<string, Record<number, WorkDayRow>>>({})
  const [whByDate, setWhByDate] = useState<Record<string, WorkDayRow>>({})
  const [nowMins, setNowMins]                 = useState(() => {
    const n = new Date(); return n.getHours() * 60 + n.getMinutes()
  })
  const [popupApp,  setPopupApp]              = useState<DbAppointment | null>(null)
  const [popupPos,  setPopupPos]              = useState({ x: 0, y: 0 })
  const [detailApp, setDetailApp]             = useState<DbAppointment | null>(null)
  const [paymentApp, setPaymentApp]           = useState<DbAppointment | null>(null)
  const datePickerRef                         = useRef<HTMLDivElement>(null)

  // ── Filter data ──
  const [filterEmployees, setFilterEmployees] = useState<{id:string;full_name:string}[]>([])
  const [filterLocations, setFilterLocations] = useState<{id:string;name:string}[]>([])
  const [filterServices,  setFilterServices]  = useState<{id:string;name:string}[]>([])
  const [selEmployees, setSelEmployees]       = useState<string[]>([])
  const [selLocations, setSelLocations]       = useState<string[]>([])
  const [selServices,  setSelServices]        = useState<string[]>([])

  const whRange = useMemo(
    () => ({
      from: format(subMonths(currentDate, 2), "yyyy-MM-dd"),
      to: format(addMonths(currentDate, 2), "yyyy-MM-dd"),
    }),
    [currentDate]
  )

  useEffect(() => {
    if (!cid) return
    async function loadFilters() {
      const [{ data: emps }, { data: locs }, { data: svcs }] = await Promise.all([
        supabase.from("employees").select("id,full_name").eq("company_id", cid).order("full_name"),
        supabase.from("service_locations").select("id,name").eq("company_id", cid).order("name"),
        supabase.from("services").select("id,name").eq("company_id", cid).order("name"),
      ])
      setFilterEmployees(emps || [])
      setFilterLocations(locs || [])
      setFilterServices(svcs || [])
    }
    void loadFilters()
  }, [cid])

  function toggleFilter(list: string[], setList: (v: string[]) => void, id: string) {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
  }

  // ── Derived ranges ──
  const weekStart  = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd    = endOfWeek(currentDate,   { weekStartsOn: 1 })
  const monthStart = startOfMonth(currentDate)
  const monthEnd   = endOfMonth(currentDate)

  const rangeStart = viewMode === "gunluk"  ? currentDate
                   : viewMode === "haftalik" ? weekStart
                   : monthStart
  const rangeEnd   = viewMode === "gunluk"  ? currentDate
                   : viewMode === "haftalik" ? weekEnd
                   : monthEnd

  const rangeStartStr = format(rangeStart, "yyyy-MM-dd")
  const rangeEndStr   = format(rangeEnd,   "yyyy-MM-dd")

  const relevantEmployeeIds = useMemo(() => {
    if (filterEmployees.length === 0) return [] as string[]
    if (selEmployees.length > 0) {
      return filterEmployees.filter((f) => selEmployees.includes(f.full_name)).map((f) => f.id)
    }
    return filterEmployees.map((f) => f.id)
  }, [filterEmployees, selEmployees])

  const gridTimeEnvelope = useMemo(() => {
    if (viewMode === "aylik")
      return { start: timeToMins(workStart), end: timeToMins(workEnd) }
    const days =
      viewMode === "gunluk"
        ? [currentDate]
        : eachDayOfInterval({ start: weekStart, end: weekEnd })
    if (days.length === 0) return { start: timeToMins(workStart), end: timeToMins(workEnd) }
    const parts = days.map((d) => dayEnvelopeMins(relevantEmployeeIds, d, whCompany, whEmp, whByDate))
    return {
      start: Math.min(...parts.map((p) => p.startMins)),
      end: Math.max(...parts.map((p) => p.endMins)),
    }
  }, [
    viewMode,
    currentDate,
    weekStart,
    weekEnd,
    relevantEmployeeIds,
    whCompany,
    whEmp,
    whByDate,
    workStart,
    workEnd,
  ])

  // ── Time slots ──
  // Extend display range to include any appointments outside working hours
  const workStartMins = gridTimeEnvelope.start
  const workEndMins   = gridTimeEnvelope.end

  const apptAllMins = appointments.flatMap((a) => [
    timeToMins(a.start_time.slice(0, 5)),
    timeToMins(a.end_time.slice(0, 5)),
  ])

  // Round down to nearest slot boundary for start, round up for end
  const rawStartMins = apptAllMins.length > 0 ? Math.min(workStartMins, ...apptAllMins) : workStartMins
  const rawEndMins   = apptAllMins.length > 0 ? Math.max(workEndMins,   ...apptAllMins) : workEndMins

  const dayStartMins = Math.floor(rawStartMins / SLOT_MINS) * SLOT_MINS
  const dayEndMins   = Math.ceil(rawEndMins   / SLOT_MINS) * SLOT_MINS

  const totalSlots   = Math.ceil((dayEndMins - dayStartMins) / SLOT_MINS)
  const timeSlots    = Array.from({ length: totalSlots }, (_, i) => minsToTime(dayStartMins + i * SLOT_MINS))
  const gridHeight   = totalSlots * SLOT_HEIGHT

  // ── Navigation ──
  function goBack() {
    if (viewMode === "gunluk")   setCurrentDate((d) => subDays(d, 1))
    if (viewMode === "haftalik") setCurrentDate((d) => subWeeks(d, 1))
    if (viewMode === "aylik")    setCurrentDate((d) => subMonths(d, 1))
  }
  function goForward() {
    if (viewMode === "gunluk")   setCurrentDate((d) => addDays(d, 1))
    if (viewMode === "haftalik") setCurrentDate((d) => addWeeks(d, 1))
    if (viewMode === "aylik")    setCurrentDate((d) => addMonths(d, 1))
  }
  function goToday() { setCurrentDate(new Date()) }

  // ── Range label ──
  const rangeLabel = viewMode === "gunluk"
    ? format(currentDate, "d MMMM yyyy, EEEE", { locale: tr })
    : viewMode === "haftalik"
    ? `${format(weekStart, "d", { locale: tr })}-${format(weekEnd, "d MMMM yyyy", { locale: tr })}`
    : format(currentDate, "MMMM yyyy", { locale: tr })

  // ── Today label ──
  const todayLabel = viewMode === "gunluk" ? "Bugün" : viewMode === "haftalik" ? "Bu hafta" : "Bu ay"

  // ── Update current time every minute ──
  useEffect(() => {
    const tick = () => {
      const n = new Date(); setNowMins(n.getHours() * 60 + n.getMinutes())
    }
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [])

  // ── Close date picker on outside click ──
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false)
      }
    }
    if (showDatePicker) document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [showDatePicker])

  // ── Şirket + çalışan çalışma saatleri (takvim & ileride puantaj) ──
  useEffect(() => {
    if (!cid) return
    let cancelled = false
    async function loadWh() {
      const { data: wh } = await supabase
        .from("working_hours")
        .select("day_of_week, is_open, start_time, end_time")
        .eq("company_id", cid)
      const map: Record<number, WorkDayRow> = {}
      if (wh) {
        for (const row of wh as {
          day_of_week: number
          is_open: boolean
          start_time: string | null
          end_time: string | null
        }[]) {
          const dow = Number(row.day_of_week)
          if (Number.isNaN(dow) || dow < 0 || dow > 6) continue
          map[dow] = {
            day_of_week: dow,
            is_open: Boolean(row.is_open),
            start_time: row.start_time,
            end_time: row.end_time,
          }
        }
      }
      if (cancelled) return
      setWhCompany(map)
      const mon = map[1]
      if (mon?.is_open && mon.start_time && mon.end_time) {
        setWorkStart(String(mon.start_time).slice(0, 5))
        setWorkEnd(String(mon.end_time).slice(0, 5))
      }
      const { data: allEmps } = await supabase
        .from("employees")
        .select("id")
        .eq("company_id", cid)
        .eq("status", "active")
      const empIds = (allEmps || []).map((e) => (e as { id: string }).id)
      if (empIds.length === 0) {
        if (!cancelled) {
          setWhEmp({})
          setWhByDate({})
        }
        return
      }
      const { data: ewhRows } = await supabase
        .from("employee_working_hours")
        .select("employee_id, day_of_week, is_open, start_time, end_time")
        .eq("company_id", cid)
        .in("employee_id", empIds)
      const empEwh: Record<string, Record<number, WorkDayRow>> = {}
      if (ewhRows) {
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
      if (cancelled) return
      setWhEmp(empEwh)
      const w0 = whRange.from
      const w1 = whRange.to
      const { data: bdr } = await supabase
        .from("employee_working_by_date")
        .select("employee_id, work_date, is_open, start_time, end_time")
        .eq("company_id", cid)
        .in("employee_id", empIds)
        .gte("work_date", w0)
        .lte("work_date", w1)
      const ovr: Record<string, WorkDayRow> = {}
      if (bdr) {
        for (const row of bdr as {
          employee_id: string
          work_date: string
          is_open: boolean
          start_time: string | null
          end_time: string | null
        }[]) {
          const ymd = row.work_date
          const k = `${row.employee_id}__${ymd}`
          const p = ymd.split("-").map((x) => Number(x)) as [number, number, number]
          const localD = new Date(p[0]!, p[1]! - 1, p[2]!)
          ovr[k] = {
            day_of_week: localD.getDay(),
            is_open: Boolean(row.is_open),
            start_time: row.start_time,
            end_time: row.end_time,
          }
        }
      }
      if (!cancelled) setWhByDate(ovr)
    }
    void loadWh()
    return () => {
      cancelled = true
    }
  }, [cid, whRange])

  // ── Fetch appointments ──
  const fetchAppointments = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from("appointments")
      .select(`id, service_id, appointment_date, start_time, end_time, status, price, notes,
        customers(id, full_name, phone), services(name, duration_hours, duration_minutes),
        employees(full_name, color), service_locations(name)`)
      .gte("appointment_date", rangeStartStr)
      .lte("appointment_date", rangeEndStr)
      .order("start_time")
    setAppointments((data as unknown as DbAppointment[]) || [])
    setLoading(false)
  }, [rangeStartStr, rangeEndStr])

  useEffect(() => { fetchAppointments() }, [fetchAppointments])

  // ── Apply active filters ──
  const visibleAppointments = appointments.filter((a) => {
    if (selEmployees.length > 0 && !selEmployees.includes(a.employees?.full_name ?? "")) return false
    if (selServices.length  > 0 && !selServices.includes(a.services?.name ?? ""))        return false
    return true
  })

  function getAppsForDay(day: Date) {
    return visibleAppointments.filter((a) => {
      const [y, m, d] = a.appointment_date.split("-").map(Number)
      return isSameDay(new Date(y, m - 1, d), day)
    })
  }

  function handleDayClick(day: Date) {
    setClickedDate(format(day, "yyyy-MM-dd"))
    setModalStartTime(undefined)
    setShowModal(true)
  }

  // ── Time-grid view (daily / weekly) ──
  function renderTimeGrid(days: Date[]) {
    const cols = days.length
    return (
      <div className={`min-w-[${cols === 1 ? "400" : "700"}px]`}>
        {/* Day headers */}
        <div
          className="grid border-b border-slate-200 bg-white sticky top-0 z-10"
          style={{ gridTemplateColumns: `60px repeat(${cols}, 1fr)` }}
        >
          <div className="h-10 border-r border-slate-100" />
          {days.map((day, i) => (
            <div
              key={i}
              className="h-10 flex flex-col items-center justify-center border-l border-slate-100 cursor-pointer hover:bg-slate-50"
              onClick={() => handleDayClick(day)}
            >
              <span className="text-xs text-slate-500">{DAY_NAMES[(getDay(day) + 6) % 7]}</span>
              <span className={cn(
                "text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full",
                isToday(day) ? "bg-blue-600 text-white" : "text-slate-700"
              )}>
                {format(day, "d")}
              </span>
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div className="grid" style={{ gridTemplateColumns: `60px repeat(${cols}, 1fr)`, height: `${gridHeight}px` }}>
          {/* Time labels */}
          <div className="relative border-r border-slate-100">
            {timeSlots.map((slot, i) => {
              const slotMins   = dayStartMins + i * SLOT_MINS
              const isNowSlot  = slotMins <= nowMins && nowMins < slotMins + SLOT_MINS
              return (
                <div
                  key={slot}
                  className="absolute w-full flex items-center justify-end pr-2"
                  style={{ top: `${i * SLOT_HEIGHT}px`, height: `${SLOT_HEIGHT}px` }}
                >
                  <span className={cn(
                    "text-[11px] leading-none font-medium",
                    isNowSlot ? "text-red-500" : "text-slate-400"
                  )}>
                    {slot}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Day columns */}
          {days.map((day, dayIdx) => {
            const dayApps  = getAppsForDay(day)
            const todayCol = isToday(day)
            const nowTop   = todayCol ? ((nowMins - dayStartMins) / SLOT_MINS) * SLOT_HEIGHT : -1
            const stackPos = layoutOverlapStack(dayApps, dayStartMins, CARD_V_GUTTER)
            return (
              <div
                key={dayIdx}
                className="relative border-l border-slate-100"
                style={{ height: `${gridHeight}px` }}
              >
                {timeSlots.map((slot, i) => {
                  const slotMins = dayStartMins + i * SLOT_MINS
                  const dayEnv = dayEnvelopeMins(relevantEmployeeIds, day, whCompany, whEmp, whByDate)
                  const isOutsideWork =
                    slotMins < dayEnv.startMins || slotMins >= dayEnv.endMins
                  const slotTime = minsToTime(slotMins)
                  return (
                    <div
                      key={slot}
                      onClick={() => {
                        setClickedDate(format(day, "yyyy-MM-dd"))
                        setModalStartTime(slotTime)
                        setShowModal(true)
                      }}
                      className={cn(
                        "absolute w-full border-t cursor-pointer group transition-colors duration-100",
                        i % 2 === 0 ? "border-slate-200" : "border-slate-100",
                        isOutsideWork
                          ? "bg-slate-50/70 hover:bg-slate-200/60"
                          : "hover:bg-blue-50/70"
                      )}
                      style={{ top: `${i * SLOT_HEIGHT}px`, height: `${SLOT_HEIGHT}px` }}
                    >
                      {/* Tooltip showing slot time on hover */}
                      <span className="absolute left-1 top-0.5 text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none select-none">
                        {slotTime}
                      </span>
                    </div>
                  )
                })}

                {/* ── Now indicator ── */}
                {todayCol && nowTop >= 0 && nowTop <= gridHeight && (
                  <div
                    className="absolute left-0 right-0 z-20 pointer-events-none"
                    style={{ top: `${nowTop}px` }}
                  >
                    <div className="relative flex items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 -ml-1.5 shadow-sm" />
                      <div className="flex-1 h-[2px] bg-red-500 opacity-80" />
                    </div>
                  </div>
                )}

                {dayApps.map((app) => {
                  const appStart = app.start_time.slice(0, 5)
                  const appEnd   = app.end_time.slice(0, 5)
                  const pos      = stackPos.get(app.id)
                  if (!pos) return null
                  const bgColor  = statusCardBg(app.status)
                  const empColor = app.employees?.color || null
                  const isIptal  = app.status === "iptal"
                  const hTitle   = `${app.customers?.full_name || "Müşteri"} · ${app.services?.name || "Hizmet"} · ${appStart} – ${appEnd}`
                  return (
                    <div
                      key={app.id}
                      title={hTitle}
                      className="absolute left-[2px] w-[calc(100%-4px)] rounded-md overflow-hidden cursor-pointer hover:brightness-110 transition-all flex"
                      style={{
                        top: `${pos.top}px`,
                        height: `${pos.height}px`,
                        backgroundColor: bgColor,
                        minHeight: "20px",
                        zIndex: pos.z,
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        setPopupApp(app)
                        setPopupPos({ x: e.clientX, y: e.clientY })
                      }}
                    >
                      {empColor && (
                        <div
                          className={cn("w-1 shrink-0 rounded-l-md", isIptal && "opacity-50")}
                          style={{ backgroundColor: empColor }}
                        />
                      )}
                      <div
                        className={cn(
                          "flex-1 min-h-0 pl-1 pr-1.5 pt-1.5 pb-1 text-white overflow-hidden flex flex-col gap-0.5",
                          isIptal && "line-through decoration-white/80"
                        )}
                      >
                        <p className="text-xs font-semibold truncate leading-tight shrink-0" title={app.customers?.full_name || ""}>
                          {app.customers?.full_name || "Müşteri"}
                        </p>
                        <p className={cn("text-xs truncate leading-snug shrink-0", !isIptal && "opacity-90")}>
                          {app.services?.name || "Hizmet"}
                        </p>
                        <p className={cn("text-xs leading-snug shrink-0", !isIptal && "opacity-75")}>
                          {appStart} - {appEnd}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Monthly view ──
  function renderMonthGrid() {
    const firstDay   = monthStart
    // Monday-start offset
    const startOffset = (getDay(firstDay) + 6) % 7
    const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
    // Pad start with empty cells
    const cells: (Date | null)[] = [
      ...Array(startOffset).fill(null),
      ...allDays,
    ]
    // Pad end to complete last row
    while (cells.length % 7 !== 0) cells.push(null)

    return (
      <div className="p-4">
        {/* Header */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_NAMES.map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-slate-500 py-2">{d}</div>
          ))}
        </div>
        {/* Weeks */}
        <div className="grid grid-cols-7 border-l border-t border-slate-200">
          {cells.map((day, i) => {
            const dayApps = day ? getAppsForDay(day) : []
            return (
              <div
                key={i}
                className={cn(
                  "border-r border-b border-slate-200 min-h-[90px] p-1 cursor-pointer hover:bg-slate-50 transition-colors",
                  day && isToday(day) ? "bg-blue-50" : ""
                )}
                onClick={() => day && handleDayClick(day)}
              >
                {day && (
                  <>
                    <span className={cn(
                      "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1",
                      isToday(day) ? "bg-blue-600 text-white" : "text-slate-700"
                    )}>
                      {format(day, "d")}
                    </span>
                    <div className="space-y-0.5">
                      {dayApps.slice(0, 3).map((app) => {
                        const mIptal = app.status === "iptal"
                        return (
                        <div
                          key={app.id}
                          className="text-[10px] text-white rounded overflow-hidden flex"
                          style={{ backgroundColor: statusCardBg(app.status) }}
                        >
                          {app.employees?.color && (
                            <div
                              className={cn("w-1 shrink-0", mIptal && "opacity-50")}
                              style={{ backgroundColor: app.employees.color }}
                            />
                          )}
                          <span className={cn("px-1 py-0.5 truncate", mIptal && "line-through decoration-white/80")}>
                            {app.start_time.slice(0, 5)} {app.customers?.full_name || app.services?.name || "Randevu"}
                          </span>
                        </div>
                        )
                      })}
                      {dayApps.length > 3 && (
                        <div className="text-[10px] text-slate-500 px-1">+{dayApps.length - 3} daha</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* ── Toolbar ── */}
      <div className="flex items-center px-4 py-3 border-b border-slate-200 shrink-0 bg-white">

        {/* Far left: sidebar toggle */}
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className={cn(
            "h-10 w-10 shrink-0 rounded-xl flex items-center justify-center transition-all duration-200 shadow-sm border",
            showSidebar
              ? "bg-blue-600 border-blue-600 text-white shadow-blue-200 shadow-md"
              : "bg-white border-slate-200 text-slate-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600"
          )}
          title="Mini takvimi göster/gizle"
        >
          <Calendar className="h-5 w-5" />
        </button>

        {/* Center: all nav items */}
        <div className="flex-1 flex items-center justify-center gap-3">
          <Button variant="outline" className="text-sm h-9 px-4 font-medium" onClick={goToday}>
            {todayLabel}
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={goBack}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="text-base font-semibold text-slate-800 min-w-[200px] text-center capitalize">
            {rangeLabel}
          </span>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={goForward}>
            <ChevronRight className="h-5 w-5" />
          </Button>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            {(["gunluk","haftalik","aylik"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={cn(
                  "px-3 h-9 text-sm font-medium transition-colors border-r last:border-r-0 border-slate-200",
                  viewMode === v ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                )}
              >
                {v === "gunluk" ? "Günlük" : v === "haftalik" ? "Haftalık" : "Aylık"}
              </button>
            ))}
          </div>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
        </div>

        {/* Far right: new appointment */}
        <Button
          className="h-9 text-sm gap-1.5 px-4 shrink-0"
          onClick={() => { setClickedDate(undefined); setModalStartTime(undefined); setShowModal(true) }}
        >
          <Plus className="h-4 w-4" />
          Yeni randevu oluştur
        </Button>
      </div>

      {/* ── Body: sidebar + calendar ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left sidebar panel ── */}
        {showSidebar && (
          <div className="w-60 shrink-0 border-r border-slate-200 overflow-y-auto bg-slate-50">
            {/* Mini calendar */}
            <MiniCalendar
              sidebarMonth={sidebarMonth}
              setSidebarMonth={setSidebarMonth}
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              viewMode={viewMode}
            />

            <div className="border-t border-slate-100 mx-3 mb-3" />

            {/* ── Employees filter ── */}
            <div className="px-3 pb-3">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Çalışanlar</p>
              <div className="space-y-1">
                {filterEmployees.map((emp) => (
                  <label key={emp.id} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5 rounded border-slate-300 accent-blue-600"
                      checked={selEmployees.includes(emp.full_name)}
                      onChange={() => toggleFilter(selEmployees, setSelEmployees, emp.full_name)}
                    />
                    <span className="text-xs text-slate-600 group-hover:text-slate-800 truncate">{emp.full_name}</span>
                  </label>
                ))}
                {filterEmployees.length === 0 && (
                  <p className="text-xs text-slate-400 italic">Henüz çalışan yok</p>
                )}
              </div>
            </div>

            {/* ── Locations filter ── */}
            <div className="px-3 pb-3">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Hizmet yerleri</p>
              <div className="space-y-1">
                {filterLocations.map((loc) => (
                  <label key={loc.id} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5 rounded border-slate-300 accent-blue-600"
                      checked={selLocations.includes(loc.id)}
                      onChange={() => toggleFilter(selLocations, setSelLocations, loc.id)}
                    />
                    <span className="text-xs text-slate-600 group-hover:text-slate-800 truncate">{loc.name}</span>
                  </label>
                ))}
                {filterLocations.length === 0 && (
                  <p className="text-xs text-slate-400 italic">Henüz hizmet yeri yok</p>
                )}
              </div>
            </div>

            {/* ── Services filter ── */}
            <div className="px-3 pb-4">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Hizmetler</p>
              <div className="space-y-1">
                {filterServices.map((svc) => (
                  <label key={svc.id} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5 rounded border-slate-300 accent-blue-600"
                      checked={selServices.includes(svc.name)}
                      onChange={() => toggleFilter(selServices, setSelServices, svc.name)}
                    />
                    <span className="text-xs text-slate-600 group-hover:text-slate-800 truncate">{svc.name}</span>
                  </label>
                ))}
                {filterServices.length === 0 && (
                  <p className="text-xs text-slate-400 italic">Henüz hizmet yok</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Main calendar area ── */}
        <div
          className="flex-1 overflow-auto"
          onClick={() => setPopupApp(null)}
        >
          {viewMode === "haftalik" && renderTimeGrid(eachDayOfInterval({ start: weekStart, end: weekEnd }))}
          {viewMode === "gunluk"   && renderTimeGrid([currentDate])}
          {viewMode === "aylik"    && renderMonthGrid()}
        </div>
      </div>

      {/* ── Detail panel (fixed overlay from right) ── */}
      {detailApp && (
        <div className="fixed inset-0 z-40">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setDetailApp(null)}
          />
          {/* Panel */}
          <div className="absolute top-0 right-0 h-full w-[390px] shadow-2xl">
            <DetailPanel
              app={detailApp}
              onClose={() => setDetailApp(null)}
              onDeleted={fetchAppointments}
              onPaymentOpen={() => { setPaymentApp(detailApp); setDetailApp(null) }}
            />
          </div>
        </div>
      )}

      {/* ── Payment panel (fixed overlay from right) ── */}
      {paymentApp && (
        <div className="fixed inset-0 z-40">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setPaymentApp(null)}
          />
          {/* Panel */}
          <div className="absolute top-0 right-0 h-full w-[390px] shadow-2xl">
            <PaymentPanel
              app={paymentApp}
              onClose={() => setPaymentApp(null)}
              onSaved={fetchAppointments}
            />
          </div>
        </div>
      )}

      {/* ── Floating appointment popup ── */}
      {popupApp && (
        <AppointmentPopup
          app={popupApp}
          pos={popupPos}
          onClose={() => setPopupApp(null)}
          onDetailOpen={() => { setDetailApp(popupApp); setPopupApp(null) }}
          onPaymentOpen={() => { setPaymentApp(popupApp); setPopupApp(null) }}
          onDelete={async () => {
            await supabase.from("appointments").delete().eq("id", popupApp.id)
            setPopupApp(null)
            fetchAppointments()
          }}
          onStatusChange={async (s) => {
            await supabase.from("appointments").update({ status: s }).eq("id", popupApp.id)
            setPopupApp((prev) => (prev ? { ...prev, status: s } : null))
            setAppointments((prev) =>
              prev.map((a) => (a.id === popupApp.id ? { ...a, status: s } : a))
            )
            if (s === "completed") {
              const { error: finErr } = await maybeRecordIncomeOnAppointmentCompleted(supabase, {
                companyId: cid,
                appointmentId: popupApp.id,
                price: popupApp.price,
                customerName: popupApp.customers?.full_name ?? null,
              })
              if (finErr) console.warn("[finance] randevu tamamlandı:", finErr.message)
              if (popupApp.customers?.id) {
                sendUsageSmsOnCompletion(supabase, {
                  companyId: cid,
                  customerId: popupApp.customers.id,
                  customerName: popupApp.customers.full_name || "",
                  customerPhone: popupApp.customers.phone,
                  serviceId: popupApp.service_id ?? null,
                }).catch(() => {})
              }
            }
            if (s === "iptal" && popupApp.customers?.phone) {
              fetch("/api/notifications/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  companyId: cid,
                  templateKey: "randevu-iptali",
                  customerId: popupApp.customers.id,
                  customerName: popupApp.customers.full_name || "",
                  customerPhone: popupApp.customers.phone.replace(/\+/g, ""),
                  customerEmail: (popupApp.customers as Record<string, unknown>).email || null,
                  params: {
                    appointment_starting_at_date: popupApp.appointment_date ? format(parseISO(popupApp.appointment_date), "dd.MM.yyyy") : "",
                    appointment_starting_at_time: popupApp.start_time?.slice(0, 5) || "",
                  },
                }),
              }).catch(() => {})
            }
            fetchAppointments()
          }}
        />
      )}

      <NewAppointmentModal
        open={showModal}
        onClose={() => { setShowModal(false); setModalStartTime(undefined) }}
        onSaved={fetchAppointments}
        defaultDate={clickedDate}
        defaultStartTime={modalStartTime}
        workStart={workStart}
        workEnd={workEnd}
        whMaps={{ company: whCompany, empByEid: whEmp, byDate: whByDate }}
      />
    </div>
  )
}
