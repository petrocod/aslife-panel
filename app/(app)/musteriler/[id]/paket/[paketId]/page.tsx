"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import {
  Loader2, ChevronDown, Plus, Edit2, Trash2,
  RefreshCw, CalendarPlus, Phone, Mail, User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { supabaseData as supabase } from "@/lib/supabase-data"
import { DateInput } from "@/components/shared/DateInput"
import { PackageOdemeSheet } from "@/components/odemeler/PackageOdemeSheet"

// ── Types ─────────────────────────────────────────────────────────────────────
type CustomerPackage = {
  id: string; customer_id: string
  start_date: string; end_date: string | null; created_at: string
  status: string; total_price: number; total_paid: number
  customers: { full_name: string; phone: string; email: string | null } | null
  packages: {
    id: string; name: string; usage_period: string
    package_services: { sessions: number; services: { name: string } | null }[]
  } | null
}

type AppRow = {
  id: string
  appointment_date: string; start_time: string; end_time: string
  status: string; price: number | null
  employee_id: string | null; location_id: string | null
  services: { name: string } | null
  employees: { id: string; full_name: string } | null
  service_locations: { id: string; name: string } | null
}

type Employee = { id: string; full_name: string }
type Location = { id: string; name: string }

const STATUS_COLORS: Record<string, string> = {
  approved:  "bg-green-100 text-green-700",
  pending:   "bg-yellow-100 text-yellow-700",
  cancelled: "bg-red-100 text-red-600",
  completed: "bg-blue-100 text-blue-700",
  active:    "bg-sky-100 text-sky-700",
}
const STATUS_LABELS: Record<string, string> = {
  approved: "Onaylandı", pending: "Bekliyor",
  cancelled: "İptal edildi", completed: "Tamamlandı", active: "Devam ediyor",
}
const PERIOD_LABELS: Record<string, string> = {
  none: "Kullanım süresi yok", "1_month": "1 Ay",
  "3_months": "3 Ay", "6_months": "6 Ay", "1_year": "1 Yıl",
}
const HOUR_OPTIONS   = Array.from({ length: 13 }, (_, i) => String(i))
const MINUTE_OPTIONS = ["0", "15", "30", "45"]

// 15-minute interval time options for the whole day
const TIME_OPTIONS_15 = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4)
  const m = (i % 4) * 15
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
})

const fmtDate = (d: string) => { try { return format(parseISO(d), "dd.MM.yyyy") } catch { return d } }

// ── Edit Appointment Modal ────────────────────────────────────────────────────
function EditModal({ app, employees, locations, onClose, onSaved }: {
  app: AppRow; employees: Employee[]; locations: Location[]
  onClose: () => void; onSaved: () => void
}) {
  const [empId,    setEmpId]    = useState(app.employees?.id || "")
  const [locId,    setLocId]    = useState(app.service_locations?.id || "")
  const [hours,    setHours]    = useState("2")
  const [minutes,  setMinutes]  = useState("0")
  const [date,     setDate]     = useState(app.appointment_date)
  const [time,     setTime]     = useState(app.start_time?.slice(0, 5) || "")
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error,    setError]    = useState("")

  function calcEnd(t: string, h: string, m: string) {
    const [sh, sm] = t.split(":").map(Number)
    const total = sh * 60 + sm + Number(h) * 60 + Number(m)
    return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
  }

  async function handleSave() {
    setSaving(true); setError("")
    const end = calcEnd(time, hours, minutes)
    const { error: e } = await supabase.from("appointments").update({
      employee_id: empId || null, location_id: locId || null,
      appointment_date: date, start_time: time + ":00", end_time: end + ":00",
    }).eq("id", app.id)
    setSaving(false)
    if (e) { setError(e.message); return }
    onSaved(); onClose()
  }

  async function handleDelete() {
    setDeleting(true)
    await supabase.from("appointments").delete().eq("id", app.id)
    setDeleting(false); onSaved(); onClose()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden gap-0">
        <div className="px-6 pt-6 pb-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-800">Randevuyu Güncelle</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <Input value={app.services?.name || ""} readOnly className="bg-slate-50 text-slate-600" placeholder="Hizmet adı" />
          <div className="grid grid-cols-2 gap-3">
            <Select value={empId} onValueChange={setEmpId}>
              <SelectTrigger><SelectValue placeholder="Çalışan seçin" /></SelectTrigger>
              <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={locId} onValueChange={setLocId}>
              <SelectTrigger><SelectValue placeholder="Hizmet yeri seçin" /></SelectTrigger>
              <SelectContent>{locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select value={hours} onValueChange={setHours}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{HOUR_OPTIONS.map((h) => <SelectItem key={h} value={h}>{h} Saat</SelectItem>)}</SelectContent>
            </Select>
            <Select value={minutes} onValueChange={setMinutes}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MINUTE_OPTIONS.map((m) => <SelectItem key={m} value={m}>{m} dakika</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Randevu tarihi</Label>
              <DateInput value={date} onChange={setDate} />
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Randevu saati</Label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger><SelectValue placeholder="Saat seçin" /></SelectTrigger>
                <SelectContent className="max-h-48">
                  {TIME_OPTIONS_15.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
          <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" onClick={handleDelete} disabled={deleting || saving}>
            {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Randevuyu sil
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving || deleting}>Vazgeç</Button>
            <Button onClick={handleSave} disabled={saving || deleting}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Değişiklikleri kaydet
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CustomerPaketDetailPage() {
  const params     = useParams()
  const router     = useRouter()
  const customerId = params.id      as string
  const paketId    = params.paketId as string

  const [innerTab,    setInnerTab]    = useState<"bilgiler" | "randevular">("bilgiler")
  const [pkg,         setPkg]         = useState<CustomerPackage | null>(null)
  const [apps,        setApps]        = useState<AppRow[]>([])
  const [employees,   setEmployees]   = useState<Employee[]>([])
  const [locations,   setLocations]   = useState<Location[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showSummary, setShowSummary] = useState(true)
  const [editApp,     setEditApp]     = useState<AppRow | null>(null)
  const [showMenu,    setShowMenu]    = useState(false)
  const [showDelete,  setShowDelete]  = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [showOdemeSheet, setShowOdemeSheet] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // close menu on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  const fetchPkg = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from("customer_packages")
      .select(`id, customer_id, start_date, end_date, created_at, status, total_price, total_paid,
        customers(full_name, phone, email),
        packages(id, name, usage_period, package_services(sessions, services(name)))`)
      .eq("id", paketId)
      .single()
    setPkg((data as unknown as CustomerPackage) ?? null)
    setLoading(false)
  }, [paketId])

  useEffect(() => {
    void fetchPkg()
  }, [fetchPkg])

  const fetchApps = useCallback(async () => {
    const { data } = await supabase.from("appointments")
      .select(`id, appointment_date, start_time, end_time, status, price,
        employee_id, location_id,
        services(name), employees(id, full_name), service_locations(id, name)`)
      .eq("customer_id", customerId).order("appointment_date")
    setApps((data as unknown as AppRow[]) || [])
  }, [customerId])

  useEffect(() => { fetchApps() }, [fetchApps])

  useEffect(() => {
    supabase.from("employees").select("id, full_name").order("full_name").then(({ data }) => setEmployees((data as Employee[]) || []))
    supabase.from("service_locations").select("id, name").order("name").then(({ data }) => setLocations((data as Location[]) || []))
  }, [])

  async function updateAppField(appId: string, field: string, value: string) {
    await supabase.from("appointments").update({ [field]: value || null }).eq("id", appId)
    setApps((prev) => prev.map((a) => {
      if (a.id !== appId) return a
      if (field === "employee_id") { const e = employees.find((x) => x.id === value); return { ...a, employee_id: value, employees: e ? { id: e.id, full_name: e.full_name } : null } }
      if (field === "location_id") { const l = locations.find((x) => x.id === value); return { ...a, location_id: value, service_locations: l ? { id: l.id, name: l.name } : null } }
      if (field === "status") return { ...a, status: value }
      return a
    }))
  }

  async function handleDeletePkg() {
    setDeleting(true)
    await supabase.from("customer_packages").delete().eq("id", paketId)
    setDeleting(false); setShowDelete(false)
    router.push(`/musteriler/${customerId}`)
  }

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
  if (!pkg)    return <div className="p-6 text-slate-500">Paket bulunamadı.</div>

  const remaining     = Number(pkg.total_price) - Number(pkg.total_paid)
  const totalSessions = pkg.packages?.package_services?.reduce((s, ps) => s + (ps.sessions || 0), 0) ?? 0
  const usedSessions  = apps.filter((a) => ["completed", "approved"].includes(a.status)).length
  const completedApps = apps.filter((a) => a.status === "completed").length
  const approvedApps  = apps.filter((a) => a.status === "approved").length
  const cancelledApps = apps.filter((a) => a.status === "cancelled").length
  const pendingApps   = apps.filter((a) => a.status === "pending").length

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-200 px-6 pt-4 pb-0 shrink-0">

        {/* Başlık: paket adı (breadcrumb üst Navbar’da: Müşteriler / Paket Detayı) */}
        {/* Title row */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-xl font-bold text-slate-800">{pkg.packages?.name}</h1>
            <div className="flex items-center gap-4 mt-1.5 text-sm text-slate-500 flex-wrap">
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> {pkg.customers?.full_name || "—"}
              </span>
              {pkg.customers?.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> {pkg.customers.phone}
                </span>
              )}
              {pkg.customers?.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> {pkg.customers.email}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Diğer işlemler */}
            <div className="relative" ref={menuRef}>
              <Button variant="outline" size="sm" className="gap-1.5 text-sm" onClick={() => setShowMenu((v) => !v)}>
                Diğer işlemler <ChevronDown className="h-3.5 w-3.5" />
              </Button>
              {showMenu && (
                <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1.5 overflow-hidden">
                  <button
                    onClick={() => { setShowMenu(false); router.push("/randevular/takvim") }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <CalendarPlus className="h-4 w-4 text-slate-400" /> Planla
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); router.push(`/hizmetler/paketler/${pkg.packages?.id}`) }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <RefreshCw className="h-4 w-4 text-slate-400" /> Tekrar sat
                  </button>
                  <button
                    onClick={() => { setShowMenu(false) }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100"
                  >
                    <Edit2 className="h-4 w-4" /> Güncelle
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); setShowDelete(true) }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" /> Paketi sil
                  </button>
                </div>
              )}
            </div>

            <Button
              type="button"
              size="sm"
              className="gap-1.5 border-0 bg-blue-600 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              onClick={() => setShowOdemeSheet(true)}
            >
              <Plus className="h-4 w-4" /> Ödeme Ekle
            </Button>
          </div>
        </div>

        {/* Paket detayına git */}
        <div className="flex justify-end mb-3">
          <Link href={`/hizmetler/paketler/${pkg.packages?.id}`} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            Paket detayına git →
          </Link>
        </div>

        {/* Stats */}
        <div className="flex gap-3 mb-4">
          {[
            { label: "Toplam paket satışı", value: `₺${Number(pkg.total_price).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` },
            { label: "Yapılan ödeme",       value: `₺${Number(pkg.total_paid).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`, color: "text-green-600" },
            { label: "Kalan bakiye",        value: `₺${remaining.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`, color: remaining > 0 ? "text-orange-600" : "text-green-600" },
          ].map((s) => (
            <div key={s.label} className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 min-w-[150px]">
              <p className={cn("text-xl font-bold text-slate-800", (s as {color?: string}).color)}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          {([
            { id: "bilgiler",   label: "Paket bilgileri" },
            { id: "randevular", label: "Paket randevuları" },
          ] as const).map((t) => (
            <button key={t.id} onClick={() => setInnerTab(t.id)}
              className={cn(
                "px-5 py-3 text-sm font-medium border-b-2 transition-colors",
                innerTab === t.id ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
              )}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto p-6">

        {/* ── Paket bilgileri ── */}
        {innerTab === "bilgiler" && (
          <div className="max-w-2xl bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {[
              { label: "Paket adı",          value: pkg.packages?.name || "—" },
              { label: "Paket durumu",        value: STATUS_LABELS[pkg.status] || pkg.status, isStatus: true, status: pkg.status },
              { label: "Paket satış tarihi",  value: pkg.created_at ? fmtDate(pkg.created_at.slice(0, 10)) : "—" },
              { label: "Kullanım süresi",     value: PERIOD_LABELS[pkg.packages?.usage_period || ""] || pkg.packages?.usage_period || "—" },
              { label: "Başlangıç tarihi",    value: fmtDate(pkg.start_date) },
              { label: "Bitiş tarihi",        value: pkg.end_date ? fmtDate(pkg.end_date) : "—" },
              { label: "Son ödeme tarihi",    value: "—" },
              { label: "Seans",               value: `${usedSessions}/${totalSessions}` },
            ].map((row) => (
              <div key={row.label} className="flex items-center px-6 py-3.5 hover:bg-slate-50">
                <div className="w-52 flex items-center gap-2 text-sm text-slate-500 shrink-0">
                  {row.label}
                </div>
                {row.isStatus ? (
                  <span className="flex items-center gap-1.5 text-sm font-medium text-blue-600">
                    {row.value} <RefreshCw className="h-3.5 w-3.5" />
                  </span>
                ) : (
                  <span className="text-sm text-slate-800">{row.value}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Paket randevuları ── */}
        {innerTab === "randevular" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Başlangıç tarihi {fmtDate(pkg.start_date)}</p>
              <button onClick={() => setShowSummary((v) => !v)} className="text-xs text-blue-600 hover:underline">
                {showSummary ? "Paket özetini gizle ▲" : "Paket özetini görüntüle →"}
              </button>
            </div>

            {/* Summary table */}
            {showSummary && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600">Paket adı</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500">Toplam seans</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-orange-500">Bekleyenler</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-green-500">Tamamlananlar</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-blue-500">Onaylananlar</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-red-400">İptal edilenler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(pkg.packages?.package_services ?? []).length === 0 ? (
                      <tr><td colSpan={6} className="px-5 py-4 text-sm text-slate-400">Hizmet bilgisi bulunamadı.</td></tr>
                    ) : pkg.packages!.package_services.map((ps, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-5 py-3 text-sm font-medium text-slate-800">{ps.services?.name || "—"}</td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-800 text-center">{ps.sessions}</td>
                        <td className="px-4 py-3 text-sm font-bold text-orange-500 text-center">{pendingApps}</td>
                        <td className="px-4 py-3 text-sm font-bold text-green-600 text-center">{completedApps}</td>
                        <td className="px-4 py-3 text-sm font-bold text-blue-600 text-center">{approvedApps}</td>
                        <td className="px-4 py-3 text-sm font-bold text-red-500 text-center">{cancelledApps}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Appointments table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500">Başlangıç-Bitiş Saati</th>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500">Hizmet adı</th>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500">Çalışan</th>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500">Hizmet yeri</th>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500">Randevu durumu</th>
                    <th className="px-5 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {apps.length === 0 ? (
                    <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-400">Bu paket için henüz randevu eklenmemiş.</td></tr>
                  ) : apps.map((app) => (
                    <tr key={app.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-slate-800">{fmtDate(app.appointment_date)}</p>
                        <p className="text-xs text-slate-500">{app.start_time?.slice(0, 5)} – {app.end_time?.slice(0, 5)}</p>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-700">{app.services?.name || "—"}</td>
                      <td className="px-5 py-3">
                        <select value={app.employees?.id || ""} onChange={(e) => updateAppField(app.id, "employee_id", e.target.value)}
                          className="text-sm text-slate-700 bg-transparent border-0 outline-none cursor-pointer pr-5 appearance-none max-w-[130px]"
                          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 0 center" }}>
                          <option value="">—</option>
                          {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                        </select>
                      </td>
                      <td className="px-5 py-3">
                        <select value={app.service_locations?.id || ""} onChange={(e) => updateAppField(app.id, "location_id", e.target.value)}
                          className="text-sm text-slate-700 bg-transparent border-0 outline-none cursor-pointer pr-5 appearance-none max-w-[110px]"
                          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 0 center" }}>
                          <option value="">—</option>
                          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                      </td>
                      <td className="px-5 py-3">
                        <div className={cn("inline-flex items-center rounded-full px-2.5 py-0.5", STATUS_COLORS[app.status] || "bg-slate-100 text-slate-600")}>
                          <select value={app.status} onChange={(e) => updateAppField(app.id, "status", e.target.value)}
                            className="text-xs font-medium bg-transparent border-0 outline-none cursor-pointer pr-4 appearance-none"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 0 center" }}>
                            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        {app.status === "completed" ? (
                          <button className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 ml-auto">
                            Takvime ekle <Plus className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button onClick={() => setEditApp(app)}
                            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 ml-auto font-medium">
                            Randevuyu Düzenle <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <PackageOdemeSheet
        open={showOdemeSheet}
        onOpenChange={setShowOdemeSheet}
        customerId={customerId}
        customerPackageId={paketId}
        customerName={pkg.customers?.full_name || "—"}
        packageName={pkg.packages?.name || "Paket"}
        totalPrice={Number(pkg.total_price)}
        totalPaid={Number(pkg.total_paid)}
        onSaved={fetchPkg}
      />

      {/* Edit appointment modal */}
      {editApp && (
        <EditModal app={editApp} employees={employees} locations={locations}
          onClose={() => setEditApp(null)} onSaved={fetchApps} />
      )}

      {/* Delete package confirm */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="max-w-sm">
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
              <Trash2 className="h-7 w-7 text-red-600" />
            </div>
            <div className="text-center">
              <h2 className="text-base font-semibold text-slate-800">Paketi sil</h2>
              <p className="text-sm text-slate-500 mt-1">
                Bu paket kaydı kalıcı olarak silinecek. Bu işlem geri alınamaz.
              </p>
            </div>
            <div className="flex gap-3 w-full">
              <Button variant="outline" className="flex-1" onClick={() => setShowDelete(false)} disabled={deleting}>Vazgeç</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleDeletePkg} disabled={deleting}>
                {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Evet, Sil
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
