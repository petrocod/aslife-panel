"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import { tr } from "date-fns/locale"
import {
  Loader2, MapPin, Phone, Mail, Edit2, Share2,
  ChevronDown, Plus, Settings, X, Check, Trash2,
  ChevronLeft, ChevronRight, Calendar, Copy, MessageCircle, MessageSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { supabaseData as supabase } from "@/lib/supabase-data"
import { useCompany, DEMO_COMPANY_ID } from "@/hooks/useCompany"
import { NotificationSection } from "@/components/shared/NotificationSection"
import { sendTestSmsAction } from "@/lib/sms-actions"
import { DateInput } from "@/components/shared/DateInput"
import { MeasurementsTab } from "@/components/customer/MeasurementsTab"
import { CustomerPortalLink } from "@/components/customer/CustomerPortalLink"
import { CustomerCommLogTab } from "@/components/customer/CustomerCommLogTab"

// ── Types ─────────────────────────────────────────────────────────────────
type Customer = {
  id: string; full_name: string; phone: string; email: string | null
  birth_date: string | null; gender: string | null; tc_no: string | null
  language: string; city: string | null; district: string | null
  address: string | null; sms_consent: boolean; email_consent: boolean
  whatsapp_consent: boolean; created_at: string
  portal_token: string | null
}
type Appointment = {
  id: string; appointment_date: string; start_time: string; end_time: string
  status: string; price: number | null; discount: number | null
  notes: string | null
  services: { name: string } | null
  employees: { full_name: string } | null
  service_locations: { name: string } | null
}
type CustomerPackage = {
  id: string; start_date: string; end_date: string | null
  status: string; total_price: number; total_paid: number
  packages: { name: string; package_services: { services: { name: string } | null }[] } | null
}
type CustomerCredit = {
  id: string; start_date: string; end_date: string | null
  total_amount: number; total_paid: number; credit_count: number
  status: string; discount_amount: number
  services: { name: string } | null
}
type DbService  = { id: string; name: string; price: number }
type ProductSaleRow = {
  id: string
  sold_at: string | null
  total_amount: number
  discount: number | null
  payment_method: string | null
  product_sale_items: {
    quantity: number
    unit_price: number
    products: { name: string } | null
  }[]
}

// ── Helpers ───────────────────────────────────────────────────────────────
const RANDEVU_PAGE_SIZE = 5

const LEGACY_APPOINTMENT_STATUS: Record<string, string> = {
  approved: "onaylandi",
  pending: "beklemede",
  cancelled: "iptal",
  completed: "tamamlandi",
}

const APPOINTMENT_STATUS_OPTIONS = [
  { value: "onaylandi", label: "Onaylandı" },
  { value: "beklemede", label: "Beklemede" },
  { value: "tamamlandi", label: "Tamamlandı" },
  { value: "iptal", label: "İptal" },
] as const

const STATUS_SELECT_TRIGGER: Record<string, string> = {
  onaylandi: "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-50",
  beklemede: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-50",
  tamamlandi: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-50",
  iptal: "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-100",
}

function toCanonAppointmentStatus(s: string) {
  if (LEGACY_APPOINTMENT_STATUS[s]) return LEGACY_APPOINTMENT_STATUS[s]
  if (APPOINTMENT_STATUS_OPTIONS.some((o) => o.value === s)) return s
  return "beklemede"
}

function isCancelledAppointmentStatus(s: string) {
  return toCanonAppointmentStatus(s) === "iptal"
}

const fmtDate = (d: string) => {
  try { return format(parseISO(d), "dd.MM.yyyy") } catch { return d }
}
const fmtTry = (n: number | null) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 2 }).format(
    Number(n ?? 0)
  )

function formatDurationMin(start: string, end: string) {
  const p = (t: string) => {
    const [h, m] = t.split(":").map((x) => Number(x))
    if (Number.isNaN(h)) return 0
    return h * 60 + (m || 0)
  }
  const mins = p(end) - p(start)
  if (mins <= 0) return "—"
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h > 0) return m > 0 ? `${h} Saat ${m} dk` : `${h} Saat`
  return `${m} dk`
}
const STATUS_COLORS: Record<string, string> = {
  approved: "bg-green-100 text-green-700",
  pending:  "bg-yellow-100 text-yellow-700",
  cancelled:"bg-red-100 text-red-700",
  completed:"bg-blue-100 text-blue-700",
  active:   "bg-green-100 text-green-700",
  onaylandi: "bg-blue-100 text-blue-700",
  beklemede: "bg-amber-100 text-amber-700",
  tamamlandi: "bg-emerald-100 text-emerald-700",
  iptal: "bg-slate-200 text-slate-600",
}
const STATUS_LABELS: Record<string, string> = {
  approved: "Onaylandı", pending: "Bekliyor",
  cancelled: "İptal edildi", completed: "Tamamlandı", active: "Devam ediyor",
  onaylandi: "Onaylandı", beklemede: "Beklemede", tamamlandi: "Tamamlandı", iptal: "İptal",
}

function AppointmentRandevuRow({
  app,
  onOpenSheet,
  onStatusChange,
  statusUpdatingId,
}: {
  app: Appointment
  onOpenSheet: (a: Appointment) => void
  onStatusChange: (appointmentId: string, s: string) => void
  statusUpdatingId: string | null
}) {
  const canon = toCanonAppointmentStatus(app.status)
  const triggerCls = STATUS_SELECT_TRIGGER[canon] ?? "border-slate-200 bg-slate-50 text-slate-800"
  const busy = statusUpdatingId === app.id

  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-3 border-b border-slate-100 px-4 py-4 last:border-b-0">
      <div className="min-w-[80px] flex-1">
        <p className="text-[11px] text-slate-400 mb-0.5">Tarih</p>
        <p className="text-sm font-medium text-slate-900">{fmtDate(app.appointment_date)}</p>
      </div>
      <div className="min-w-[96px] flex-1">
        <p className="text-[11px] text-slate-400 mb-0.5">Saat</p>
        <p className="text-sm text-slate-900 tabular-nums">
          {app.start_time?.slice(0, 5)} – {app.end_time?.slice(0, 5)}
        </p>
      </div>
      <div className="min-w-[100px] flex-[1.15]">
        <p className="text-[11px] text-slate-400 mb-0.5">Hizmet</p>
        <p className="text-sm text-slate-900">{app.services?.name || "—"}</p>
      </div>
      <div className="min-w-[80px] flex-1">
        <p className="text-[11px] text-slate-400 mb-0.5">Çalışan</p>
        <p className="text-sm text-slate-900">{app.employees?.full_name || "—"}</p>
      </div>
      <div className="min-w-[148px]">
        <p className="text-[11px] text-slate-400 mb-0.5">Randevu Durumu</p>
        <Select
          value={canon}
          onValueChange={(v) => onStatusChange(app.id, v)}
          disabled={busy}
        >
          <SelectTrigger className={cn("h-8 w-full max-w-[158px] text-xs font-medium shadow-sm", triggerCls)}>
            <span className="flex w-full min-w-0 items-center gap-1.5">
              {busy && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />}
              <SelectValue />
            </span>
          </SelectTrigger>
          <SelectContent>
            {APPOINTMENT_STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="ml-auto flex shrink-0 items-end gap-1">
        <div className="text-right">
          <p className="text-[11px] text-slate-400 mb-0.5">Hizmet bedeli</p>
          <p className="text-sm font-semibold tabular-nums text-slate-900">{fmtTry(app.price)}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
          onClick={() => onOpenSheet(app)}
          aria-label="Randevu detayı"
        >
          <Edit2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function RandevuPaginationBar({
  pageSafe,
  totalPages,
  totalCount,
  onPage,
}: {
  pageSafe: number
  totalPages: number
  totalCount: number
  onPage: (p: number) => void
}) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).slice(
    Math.max(0, pageSafe - 3),
    pageSafe + 2
  )
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-3 py-2.5 text-xs text-slate-600">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7"
          disabled={pageSafe <= 1}
          onClick={() => onPage(Math.max(1, pageSafe - 1))}
          aria-label="Önceki sayfa"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPage(p)}
            className={cn(
              "h-7 min-w-7 rounded-md border px-2 text-[11px] font-medium",
              p === pageSafe
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            {p}
          </button>
        ))}
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7"
          disabled={pageSafe >= totalPages}
          onClick={() => onPage(Math.min(totalPages, pageSafe + 1))}
          aria-label="Sonraki sayfa"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
      <p>Toplam kayıt: {totalCount} adet</p>
    </div>
  )
}

// ── Tab definitions ────────────────────────────────────────────────────────
const TABS = [
  { id: "bilgiler",  label: "Müşteri Bilgileri", icon: "👤" },
  { id: "paketler",  label: "Paketler",           icon: "📦" },
  { id: "siniflar",  label: "Sınıflar",            icon: "🎓" },
  { id: "randevular",label: "Randevular",          icon: "📅" },
  { id: "krediler",  label: "Krediler",            icon: "💳" },
  { id: "urunler",   label: "Ürün Satışları",      icon: "🛒" },
  { id: "olcumler",  label: "Ölçümler",            icon: "📏" },
  { id: "mesajlar",  label: "Mesaj geçmişi",       icon: "💬" },
]

// ── Kredi Satışı Modal ─────────────────────────────────────────────────────
function KrediModal({
  open, onClose, customerId, customerName, companyId, onSaved, services,
}: {
  open: boolean; onClose: () => void; customerId: string
  customerName: string; companyId: string | null; onSaved: () => void
  services: DbService[]
}) {
  const [serviceId, setServiceId]   = useState("")
  const [startDate, setStartDate]   = useState(format(new Date(), "yyyy-MM-dd"))
  const [endDate, setEndDate]       = useState("")
  const [lastPayDate, setLastPayDate] = useState("")
  const [fee, setFee]               = useState("")
  const [credits, setCredits]       = useState("1")
  const [discount, setDiscount]     = useState("0")
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState("")

  const svc        = services.find((s) => s.id === serviceId)
  const total      = (Number(fee) || 0) * (Number(credits) || 1)
  const discounted = total - (Number(discount) || 0)

  async function handleSave() {
    if (!serviceId) { setError("Hizmet seçiniz."); return }
    setSaving(true); setError("")
    const { error: e } = await supabase.from("customer_credits").insert({
      company_id:     companyId || DEMO_COMPANY_ID,
      customer_id:    customerId,
      service_id:     serviceId,
      start_date:     startDate,
      end_date:       endDate || null,
      last_payment_date: lastPayDate || null,
      total_amount:   discounted,
      total_paid:     0,
      credit_count:   Number(credits) || 1,
      discount_amount:Number(discount) || 0,
      status:         "active",
    })
    setSaving(false)
    if (e) { setError(e.message); return }
    onSaved(); onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold">Kredi Satışı</h2>
            <p className="text-xs text-slate-500">Aşağıdaki alanları doldurarak hizmetinizi satabilirsiniz.</p>
          </div>
        </div>
        {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded mb-3">{error}</p>}
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Müşteri adı *</Label>
            <Input className="mt-1" value={customerName} disabled />
          </div>
          <div>
            <Label className="text-xs">Hizmet adı *</Label>
            <Select value={serviceId} onValueChange={(v) => { setServiceId(v); const s = services.find(x=>x.id===v); if(s) setFee(String(s.price)) }}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Hizmet seçin" /></SelectTrigger>
              <SelectContent>
                {services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Başlangıç tarihi *</Label>
              <DateInput value={startDate} onChange={setStartDate} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Bitiş tarihi</Label>
              <DateInput value={endDate} onChange={setEndDate} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Son ödeme tarihi</Label>
            <DateInput value={lastPayDate} onChange={setLastPayDate} className="mt-1" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Hizmet ücreti</Label>
              <div className="flex items-center border rounded-md px-2 h-9 mt-1">
                <span className="text-slate-400 text-sm mr-1">₺</span>
                <input className="flex-1 text-sm outline-none" type="number" value={fee} onChange={(e) => setFee(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Kredi</Label>
              <Input type="number" min="1" className="mt-1" value={credits} onChange={(e) => setCredits(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Ödenecek tutar</Label>
              <div className="flex items-center border rounded-md px-2 h-9 mt-1 bg-slate-50">
                <span className="text-slate-400 text-sm mr-1">₺</span>
                <span className="text-sm">{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div>
            <Label className="text-xs">İndirim tutarı</Label>
            <div className="flex items-center border rounded-md px-2 h-9 mt-1">
              <span className="text-slate-400 text-sm mr-1">₺</span>
              <input className="flex-1 text-sm outline-none" type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-between text-sm border-t pt-3">
            <span className="text-slate-600">İndirim</span>
            <span>₺{Number(discount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold">
            <span>Toplam paket ücreti</span>
            <span>₺{discounted.toFixed(2)}</span>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onClose}>Vazgeç</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Kaydet
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function MusteriDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id     = params.id as string
  const { companyId } = useCompany()

  const [tab, setTab]                         = useState("bilgiler")
  const [customer, setCustomer]               = useState<Customer | null>(null)
  const [loading, setLoading]                 = useState(true)
  const [showDigerMenu, setShowDigerMenu]     = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting]               = useState(false)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [pkgs, setPkgs]                 = useState<CustomerPackage[]>([])
  const [credits, setCredits]           = useState<CustomerCredit[]>([])
  const [productSales, setProductSales] = useState<ProductSaleRow[]>([])
  const [services, setServices]         = useState<DbService[]>([])
  const [showKrediModal, setShowKrediModal] = useState(false)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [calCopied, setCalCopied] = useState(false)
  const [summaryCopied, setSummaryCopied] = useState(false)
  const [smsSending, setSmsSending] = useState(false)
  const [smsSent, setSmsSent] = useState(false)
  const [calSmsSending, setCalSmsSending] = useState(false)
  const [calSmsSent, setCalSmsSent] = useState(false)
  const [sheetApp, setSheetApp] = useState<Appointment | null>(null)
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null)
  const [upcomingPage, setUpcomingPage] = useState(1)
  const [pastPage, setPastPage] = useState(1)

  // Notification consent states (synced from customer)
  const [smsConsent, setSmsConsent]           = useState(true)
  const [emailConsent, setEmailConsent]       = useState(true)
  const [whatsappConsent, setWhatsappConsent] = useState(true)
  const [savingConsent, setSavingConsent]     = useState(false)

  // Fetch customer
  useEffect(() => {
    supabase.from("customers").select("*").eq("id", id).single()
      .then(({ data }) => {
        setCustomer(data)
        if (data) {
          setSmsConsent(data.sms_consent ?? true)
          setEmailConsent(data.email_consent ?? true)
          setWhatsappConsent(data.whatsapp_consent ?? true)
        }
        setLoading(false)
      })
  }, [id])

  async function handleDelete() {
    setDeleting(true)
    await supabase.from("customers").delete().eq("id", id)
    setDeleting(false)
    setShowDeleteConfirm(false)
    router.push("/musteriler")
    router.refresh()
  }

  async function handleSaveConsent() {
    setSavingConsent(true)
    await supabase.from("customers").update({
      sms_consent: smsConsent,
      email_consent: emailConsent,
      whatsapp_consent: whatsappConsent,
    }).eq("id", id)
    setSavingConsent(false)
  }

  // Fetch tab data
  const fetchAppointments = useCallback(async () => {
    const { data } = await supabase.from("appointments")
      .select("id,appointment_date,start_time,end_time,status,price,discount,notes,services(name),employees(full_name),service_locations(name)")
      .eq("customer_id", id).order("appointment_date", { ascending: false })
    setAppointments((data as unknown as Appointment[]) || [])
  }, [id])

  const fetchPackages = useCallback(async () => {
    const { data } = await supabase.from("customer_packages")
      .select("id,start_date,end_date,status,total_price,total_paid,packages(name,package_services(services(name)))")
      .eq("customer_id", id).order("created_at", { ascending: false })
    setPkgs((data as unknown as CustomerPackage[]) || [])
  }, [id])

  const fetchProductSales = useCallback(async () => {
    const { data } = await supabase
      .from("product_sales")
      .select(
        "id, sold_at, total_amount, discount, payment_method, product_sale_items(quantity, unit_price, products(name))"
      )
      .eq("customer_id", id)
      .order("sold_at", { ascending: false })
    setProductSales((data as unknown as ProductSaleRow[]) || [])
  }, [id])

  const fetchCredits = useCallback(async () => {
    const { data } = await supabase.from("customer_credits")
      .select("id,start_date,end_date,total_amount,total_paid,credit_count,status,discount_amount,services(name)")
      .eq("customer_id", id).order("created_at", { ascending: false })
    setCredits((data as unknown as CustomerCredit[]) || [])
  }, [id])

  useEffect(() => {
    fetchAppointments()
    fetchPackages()
    fetchCredits()
    fetchProductSales()
    supabase.from("services").select("id,name,price").order("name").then(({ data }) => setServices(data || []))
  }, [fetchAppointments, fetchPackages, fetchCredits, fetchProductSales])

  const todayStr = format(new Date(), "yyyy-MM-dd")

  const { totalApps, cancelledApps, upcomingList, pastList } = useMemo(() => {
    const total = appointments.length
    const cancelled = appointments.filter((a) => isCancelledAppointmentStatus(a.status)).length
    const upcoming = appointments
      .filter((a) => a.appointment_date >= todayStr && !isCancelledAppointmentStatus(a.status))
      .sort((a, b) => {
        const d = a.appointment_date.localeCompare(b.appointment_date)
        if (d !== 0) return d
        return (a.start_time || "").localeCompare(b.start_time || "")
      })
    const past = appointments
      .filter((a) => a.appointment_date < todayStr || isCancelledAppointmentStatus(a.status))
      .sort((a, b) => {
        const d = b.appointment_date.localeCompare(a.appointment_date)
        if (d !== 0) return d
        return (b.start_time || "").localeCompare(a.start_time || "")
      })
    return { totalApps: total, cancelledApps: cancelled, upcomingList: upcoming, pastList: past }
  }, [appointments, todayStr])

  const upcomingTotalPages = Math.max(1, Math.ceil(upcomingList.length / RANDEVU_PAGE_SIZE))
  const pastTotalPages = Math.max(1, Math.ceil(pastList.length / RANDEVU_PAGE_SIZE))
  const upcomingPageSafe = Math.min(upcomingPage, upcomingTotalPages)
  const pastPageSafe = Math.min(pastPage, pastTotalPages)

  const upcomingPageRows = useMemo(() => {
    const start = (upcomingPageSafe - 1) * RANDEVU_PAGE_SIZE
    return upcomingList.slice(start, start + RANDEVU_PAGE_SIZE)
  }, [upcomingList, upcomingPageSafe])

  const pastPageRows = useMemo(() => {
    const start = (pastPageSafe - 1) * RANDEVU_PAGE_SIZE
    return pastList.slice(start, start + RANDEVU_PAGE_SIZE)
  }, [pastList, pastPageSafe])

  useEffect(() => {
    setUpcomingPage((p) => Math.min(p, upcomingTotalPages))
  }, [upcomingTotalPages])

  useEffect(() => {
    setPastPage((p) => Math.min(p, pastTotalPages))
  }, [pastTotalPages])

  useEffect(() => {
    if (!sheetApp) return
    const fresh = appointments.find((a) => a.id === sheetApp.id)
    if (fresh) setSheetApp(fresh)
    else setSheetApp(null)
  }, [appointments, sheetApp?.id])

  async function updateAppointmentStatus(appointmentId: string, newStatus: string) {
    setStatusUpdatingId(appointmentId)
    const { error } = await supabase
      .from("appointments")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", appointmentId)
    setStatusUpdatingId(null)
    if (!error) await fetchAppointments()
  }

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
  if (!customer) return <div className="p-6 text-slate-500">Müşteri bulunamadı.</div>

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-200 px-6 pt-4 pb-0 shrink-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-xs text-slate-500 mb-3">
          <Link href="/musteriler" className="hover:text-blue-600 transition-colors">Müşteriler</Link>
          <span>/</span>
          <span className="text-slate-700 font-medium">{customer.full_name}</span>
        </div>

        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">{customer.full_name}</h1>
            <div className="flex items-center gap-4 mt-1.5 text-sm text-slate-500 flex-wrap">
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {customer.city || "—"}</span>
              <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {customer.phone || "—"}</span>
              <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {customer.email || "—"}</span>
              <span className="flex items-center gap-1 text-xs">📅 {fmtDate(customer.created_at)}</span>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {/* Diğer işlemler dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-sm"
                onClick={() => setShowDigerMenu((v) => !v)}
              >
                Diğer işlemler <ChevronDown className="h-3.5 w-3.5" />
              </Button>
              {showDigerMenu && (
                <>
                  {/* backdrop */}
                  <div className="fixed inset-0 z-10" onClick={() => setShowDigerMenu(false)} />
                  <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                    <button
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      onClick={() => { setShowDigerMenu(false); router.push(`/musteriler/${id}/duzenle`) }}
                    >
                      <Edit2 className="h-4 w-4 text-slate-400" />
                      Bilgileri düzenle
                    </button>
                    <button
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      onClick={() => { setShowDigerMenu(false); setShowDeleteConfirm(true) }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Kaydı sil
                    </button>
                  </div>
                </>
              )}
            </div>

            <Button
              size="sm"
              className="gap-1.5 text-sm bg-blue-600 hover:bg-blue-700"
              onClick={() => setShowSummaryModal(true)}
            >
              <Share2 className="h-3.5 w-3.5" /> Özet Paylaş
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-3 mb-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 min-w-[120px]">
            <p className="text-2xl font-bold text-slate-800">{totalApps}</p>
            <p className="text-xs text-slate-500 mt-0.5">Toplam Randevu</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 min-w-[120px]">
            <p className="text-2xl font-bold text-slate-800">{cancelledApps}</p>
            <p className="text-xs text-slate-500 mt-0.5">İptal Edilen Randevu</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-slate-200">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                tab === t.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              <span className="text-base leading-none">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-auto">

        {/* ── Müşteri Bilgileri ── */}
        {tab === "bilgiler" && (
          <div className="p-6 max-w-3xl">
            <CustomerPortalLink
              customerId={id}
              portalToken={customer.portal_token ?? null}
              onTokenReady={(t) => setCustomer((c) => (c ? { ...c, portal_token: t } : c))}
            />
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {[
                { label: "Müşteri Adı Soyadı", icon: "👤", value: customer.full_name },
                { label: "Telefon numarası",    icon: "📞", value: customer.phone || "—" },
                { label: "e-Mail",              icon: "✉️", value: customer.email || "—" },
                { label: "Doğum tarihi",        icon: "🎂", value: customer.birth_date ? fmtDate(customer.birth_date) : "—" },
                { label: "Cinsiyet",            icon: "🔵", value: customer.gender === "male" ? "Erkek" : customer.gender === "female" ? "Kadın" : "Belirtmek istemiyorum" },
                { label: "T.C kimlik numarası", icon: "🪪", value: customer.tc_no || "—" },
                { label: "Adres",               icon: "📍", value: [customer.address, customer.district, customer.city].filter(Boolean).join(", ") || "—" },
              ].map((row) => (
                <div key={row.label} className="flex items-center px-6 py-3.5 hover:bg-slate-50">
                  <div className="w-48 flex items-center gap-2 text-sm text-slate-500 shrink-0">
                    <span>{row.icon}</span>{row.label}
                  </div>
                  <span className="text-sm text-slate-800">{row.value}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => router.push(`/musteriler/${id}/duzenle`)}>
                <Edit2 className="h-4 w-4" /> Bilgileri Düzenle
              </Button>
            </div>

            {/* Notification section – separate, always below info */}
            <div className="mt-2">
              <NotificationSection
                smsConsent={smsConsent}
                emailConsent={emailConsent}
                whatsappConsent={whatsappConsent}
                onSmsChange={setSmsConsent}
                onEmailChange={setEmailConsent}
                onWhatsappChange={setWhatsappConsent}
              />
              <div className="flex justify-end mt-3">
                <Button size="sm" onClick={handleSaveConsent} disabled={savingConsent}>
                  {savingConsent && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
                  Bildirimleri Kaydet
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Paketler ── */}
        {tab === "paketler" && (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Input placeholder="Paket ara" className="max-w-sm h-8 text-sm" />
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input type="checkbox" className="rounded" />
                Tamamlanan paketleri gizle
              </label>
              <div className="ml-auto">
                <DateInput value="" onChange={() => {}} className="h-8 w-36" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {["Paket adı","Hizmetler","Başlangıç tarihi","Bitiş tarihi","Paket ücreti","Paket durumu",""].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pkgs.length === 0 ? (
                    <tr><td colSpan={7} className="py-12 text-center text-sm text-slate-500">Henüz paket satışı yapılmamış.</td></tr>
                  ) : pkgs.map((pkg) => {
                    const svcNames = pkg.packages?.package_services?.map((ps) => ps.services?.name).filter(Boolean).join(", ") || "—"
                    const goPaket = () => router.push(`/musteriler/${id}/paket/${pkg.id}`)
                    return (
                      <tr
                        key={pkg.id}
                        role="button"
                        tabIndex={0}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={goPaket}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            goPaket()
                          }
                        }}
                      >
                        <td className="px-5 py-3.5 text-sm font-medium text-slate-800">{pkg.packages?.name || "—"}</td>
                        <td className="px-5 py-3.5 text-sm text-slate-600">{svcNames}</td>
                        <td className="px-5 py-3.5 text-sm text-slate-600">{fmtDate(pkg.start_date)}</td>
                        <td className="px-5 py-3.5 text-sm text-slate-600">{pkg.end_date ? fmtDate(pkg.end_date) : "—"}</td>
                        <td className="px-5 py-3.5 text-sm text-slate-600">₺{Number(pkg.total_price).toFixed(2)}</td>
                        <td className="px-5 py-3.5">
                          <span className={cn("text-xs px-2 py-1 rounded-full font-medium", STATUS_COLORS[pkg.status] || "bg-slate-100 text-slate-600")}>
                            {STATUS_LABELS[pkg.status] || pkg.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-blue-600 flex items-center gap-1 select-none">
                            Yönet <Settings className="h-3.5 w-3.5" />
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-500">
                Toplam kayıt: {pkgs.length} adet
              </div>
            </div>
          </div>
        )}

        {/* ── Sınıflar ── */}
        {tab === "siniflar" && (
          <div className="p-6 text-center text-sm text-slate-500 mt-12">
            <p className="text-4xl mb-3">🎓</p>
            <p>Henüz sınıf kaydı bulunmuyor.</p>
          </div>
        )}

        {/* ── Randevular ── */}
        {tab === "randevular" && (
          <div className="p-6 space-y-8">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Yaklaşan Randevular</h3>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                {upcomingList.length === 0 ? (
                  <p className="px-4 py-10 text-center text-sm text-slate-500">Yaklaşan randevu bulunmuyor.</p>
                ) : (
                  upcomingPageRows.map((app) => (
                    <AppointmentRandevuRow
                      key={app.id}
                      app={app}
                      onOpenSheet={setSheetApp}
                      onStatusChange={updateAppointmentStatus}
                      statusUpdatingId={statusUpdatingId}
                    />
                  ))
                )}
                {upcomingList.length > 0 && (
                  <RandevuPaginationBar
                    pageSafe={upcomingPageSafe}
                    totalPages={upcomingTotalPages}
                    totalCount={upcomingList.length}
                    onPage={setUpcomingPage}
                  />
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Geçmiş Randevular</h3>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                {pastList.length === 0 ? (
                  <p className="px-4 py-10 text-center text-sm text-slate-500">Geçmiş randevu bulunmuyor.</p>
                ) : (
                  pastPageRows.map((app) => (
                    <AppointmentRandevuRow
                      key={app.id}
                      app={app}
                      onOpenSheet={setSheetApp}
                      onStatusChange={updateAppointmentStatus}
                      statusUpdatingId={statusUpdatingId}
                    />
                  ))
                )}
                {pastList.length > 0 && (
                  <RandevuPaginationBar
                    pageSafe={pastPageSafe}
                    totalPages={pastTotalPages}
                    totalCount={pastList.length}
                    onPage={setPastPage}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Krediler ── */}
        {tab === "krediler" && (
          <div className="p-6">
            <div className="flex justify-end mb-4">
              <Button size="sm" className="gap-1.5" onClick={() => setShowKrediModal(true)}>
                <Plus className="h-4 w-4" /> Kredi Ekle
              </Button>
            </div>

            {/* Active credits */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Aktif Krediler</h3>
              {credits.filter((c) => c.status === "active").length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                  <p className="text-3xl mb-2">💰</p>
                  <p className="text-sm font-medium text-slate-700">Krediler</p>
                  <p className="text-xs text-slate-500 mt-1">Müşteri için kredi geçmişi bulunamadı. Kredi ekleyerek başlayabilirsiniz.</p>
                  <Button size="sm" className="mt-4 gap-1" onClick={() => setShowKrediModal(true)}>
                    <Plus className="h-4 w-4" /> Kredi Ekle
                  </Button>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        {["Hizmet","Başlangıç","Bitiş","Kredi","Toplam","Ödenen","Kalan","Durum"].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {credits.filter((c) => c.status === "active").map((cr) => (
                        <tr key={cr.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm font-medium">{cr.services?.name || "—"}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{fmtDate(cr.start_date)}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{cr.end_date ? fmtDate(cr.end_date) : "—"}</td>
                          <td className="px-4 py-3 text-sm">{cr.credit_count}</td>
                          <td className="px-4 py-3 text-sm">₺{Number(cr.total_amount).toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-green-600">₺{Number(cr.total_paid).toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-red-500">₺{(Number(cr.total_amount) - Number(cr.total_paid)).toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <span className={cn("text-xs px-2 py-1 rounded-full font-medium", STATUS_COLORS[cr.status] || "")}>
                              {STATUS_LABELS[cr.status] || cr.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Credit history */}
            {credits.filter((c) => c.status !== "active").length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Kredi Geçmişi</h3>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        {["Hizmet","Başlangıç","Bitiş","Kredi","Toplam","Ödenen","Durum"].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {credits.filter((c) => c.status !== "active").map((cr) => (
                        <tr key={cr.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 opacity-70">
                          <td className="px-4 py-3 text-sm">{cr.services?.name || "—"}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{fmtDate(cr.start_date)}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{cr.end_date ? fmtDate(cr.end_date) : "—"}</td>
                          <td className="px-4 py-3 text-sm">{cr.credit_count}</td>
                          <td className="px-4 py-3 text-sm">₺{Number(cr.total_amount).toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm">₺{Number(cr.total_paid).toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <span className={cn("text-xs px-2 py-1 rounded-full font-medium", STATUS_COLORS[cr.status] || "bg-slate-100 text-slate-500")}>
                              {STATUS_LABELS[cr.status] || cr.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Ürün satışları ── */}
        {tab === "urunler" && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <h3 className="font-medium text-slate-800">Ürün satın alımları</h3>
              <p className="text-xs text-slate-500 mt-0.5">Müşteriye kayıtlı ürün satışları</p>
                                    </div>
            {productSales.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500">Henüz ürün satışı yok.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    {["Tarih", "Ürünler", "Tutar", "Ödeme"].map((h) => (
                      <th key={h} className="text-left px-5 py-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {productSales.map((sale) => {
                    const items = sale.product_sale_items || []
                    const names = items
                      .map((it) => `${it.products?.name || "Ürün"} × ${it.quantity}`)
                      .join(", ")
                    const sold = sale.sold_at
                      ? format(parseISO(sale.sold_at.slice(0, 10)), "dd.MM.yyyy")
                      : "—"
                    return (
                      <tr key={sale.id} className="border-t border-slate-100">
                        <td className="px-5 py-3 text-slate-700">{sold}</td>
                        <td className="px-5 py-3 text-slate-800">{names || "—"}</td>
                        <td className="px-5 py-3 font-semibold tabular-nums">{fmtTry(Number(sale.total_amount))}</td>
                        <td className="px-5 py-3 text-slate-600">{sale.payment_method || "—"}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === "mesajlar" && <CustomerCommLogTab customerId={id} />}

        {/* ── Ölçümler ── */}
        {tab === "olcumler" && (
          <MeasurementsTab customerId={id} companyId={companyId} />
        )}
      </div>

      <Sheet open={!!sheetApp} onOpenChange={(open) => { if (!open) setSheetApp(null) }}>
        <SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-md">
          {sheetApp && (
            <>
              <SheetHeader className="border-b border-slate-100 pb-4 text-left">
                <SheetTitle>Randevu detay</SheetTitle>
                <p className="text-sm font-normal text-slate-500">
                  Randevunuz ile ilgili değişiklikleri yapabilirsiniz.
                </p>
              </SheetHeader>
              <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
                <div>
                  <p className="font-semibold text-slate-900">{customer.full_name}</p>
                  <p className="text-sm text-slate-600">{customer.phone || "—"}</p>
                  <Link
                    href={`/musteriler/${id}/duzenle`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Müşteri bilgilerini düzenle
                  </Link>
                </div>

                <div>
                  <p className="text-[11px] text-slate-400 mb-1.5">Randevu durumu</p>
                  <Select
                    value={toCanonAppointmentStatus(sheetApp.status)}
                    onValueChange={(v) => updateAppointmentStatus(sheetApp.id, v)}
                    disabled={statusUpdatingId === sheetApp.id}
                  >
                    <SelectTrigger
                      className={cn(
                        "h-9 w-full max-w-full font-medium shadow-sm",
                        STATUS_SELECT_TRIGGER[toCanonAppointmentStatus(sheetApp.status)] ??
                          "border-slate-200 bg-slate-50"
                      )}
                    >
                      <span className="flex w-full items-center gap-2">
                        {statusUpdatingId === sheetApp.id && (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                        )}
                        <SelectValue />
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {APPOINTMENT_STATUS_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <p className="text-lg font-bold tabular-nums text-slate-900">
                      {fmtTry(sheetApp.price)}
                    </p>
                    {Number(sheetApp.discount ?? 0) > 0 && (
                      <p className="text-sm text-slate-400 line-through tabular-nums">
                        {fmtTry(Number(sheetApp.price ?? 0) + Number(sheetApp.discount ?? 0))}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/odemeler/musteriler/${id}`}
                    className="text-sm font-medium text-blue-600 hover:underline shrink-0"
                  >
                    Ödemeye git →
                  </Link>
                </div>

                <dl className="divide-y divide-slate-100 text-sm">
                  <div className="flex justify-between gap-4 py-2.5">
                    <dt className="text-slate-500">Hizmet</dt>
                    <dd className="font-medium text-slate-900 text-right">{sheetApp.services?.name || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2.5">
                    <dt className="text-slate-500">Çalışan</dt>
                    <dd className="font-medium text-slate-900 text-right">{sheetApp.employees?.full_name || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2.5">
                    <dt className="text-slate-500">Tarih</dt>
                    <dd className="font-medium text-slate-900">{fmtDate(sheetApp.appointment_date)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2.5">
                    <dt className="text-slate-500">Saat</dt>
                    <dd className="font-medium text-slate-900 tabular-nums">
                      {sheetApp.start_time?.slice(0, 5)} – {sheetApp.end_time?.slice(0, 5)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2.5">
                    <dt className="text-slate-500">Hizmet alanı</dt>
                    <dd className="font-medium text-slate-900 text-right">
                      {sheetApp.service_locations?.name || "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2.5">
                    <dt className="text-slate-500">Süre</dt>
                    <dd className="font-medium text-slate-900">
                      {formatDurationMin(sheetApp.start_time, sheetApp.end_time)}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1 py-2.5">
                    <dt className="text-slate-500">Randevu Notu</dt>
                    <dd className="text-slate-800 whitespace-pre-wrap">{sheetApp.notes?.trim() || "—"}</dd>
                  </div>
                </dl>

                <Link
                  href="/randevular/takvim"
                  className="inline-block text-sm font-medium text-blue-600 hover:underline"
                >
                  Randevu detayını düzenle →
                </Link>
              </div>
              <SheetFooter className="border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setSheetApp(null)}>
                  Kapat
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Kredi modal */}
      <KrediModal
        open={showKrediModal}
        onClose={() => setShowKrediModal(false)}
        customerId={id}
        customerName={customer.full_name}
        companyId={companyId ?? null}
        onSaved={fetchCredits}
        services={services}
      />

      {/* Summary modal */}
      <Dialog open={showSummaryModal} onOpenChange={setShowSummaryModal}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <div className="mb-3">
            <h2 className="text-base font-semibold text-slate-800">Müşteri Özeti</h2>
            <p className="text-xs text-slate-500 mt-0.5">{customer.full_name} – {customer.phone || "—"}</p>
          </div>

          {/* Yaklaşan Randevular */}
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Yaklaşan Randevular ({upcomingList.length})</h3>
            {upcomingList.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">Yaklaşan randevu yok.</p>
            ) : (
              <div className="space-y-1.5">
                {upcomingList.slice(0, 8).map((a) => (
                  <div key={a.id} className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-800">{a.services?.name || "—"}</span>
                      <span className="text-slate-500 tabular-nums text-xs">{fmtDate(a.appointment_date)}</span>
                    </div>
                    <div className="flex justify-between mt-0.5 text-xs text-slate-500">
                      <span>{a.employees?.full_name || "—"}</span>
                      <span className="tabular-nums">{a.start_time?.slice(0, 5)} – {a.end_time?.slice(0, 5)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bakiye (Mande Bdehi) */}
          {(() => {
            const pkgDebt = pkgs.reduce((s, p) => s + Math.max(0, Number(p.total_price) - Number(p.total_paid)), 0)
            const creditDebt = credits.reduce((s, c) => s + Math.max(0, Number(c.total_amount) - Number(c.total_paid)), 0)
            const totalDebt = pkgDebt + creditDebt
            if (totalDebt <= 0) return null
            return (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">Kalan Bakiye (Borç)</h3>
                {pkgDebt > 0 && pkgs.filter(p => Number(p.total_price) - Number(p.total_paid) > 0).map((p) => (
                  <div key={p.id} className="flex justify-between text-sm py-1">
                    <span className="text-slate-700">{p.packages?.name || "Paket"}</span>
                    <span className="font-semibold text-red-700 tabular-nums">₺{(Number(p.total_price) - Number(p.total_paid)).toFixed(0)}</span>
                  </div>
                ))}
                {creditDebt > 0 && credits.filter(c => Number(c.total_amount) - Number(c.total_paid) > 0).map((c) => (
                  <div key={c.id} className="flex justify-between text-sm py-1">
                    <span className="text-slate-700">{(c as any).services?.name || "Kredi"}</span>
                    <span className="font-semibold text-red-700 tabular-nums">₺{(Number(c.total_amount) - Number(c.total_paid)).toFixed(0)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-bold pt-2 mt-2 border-t border-red-200">
                  <span className="text-red-800">Toplam Borç</span>
                  <span className="text-red-800 tabular-nums">₺{totalDebt.toFixed(0)}</span>
                </div>
              </div>
            )
          })()}

          {/* Actions */}
          {(() => {
            const apptLines = upcomingList.slice(0, 8).map((a) =>
              `  ${fmtDate(a.appointment_date)} ${a.start_time?.slice(0,5)}-${a.end_time?.slice(0,5)} | ${a.services?.name || "—"} | ${a.employees?.full_name || "—"}`
            )
            const pkgDebt = pkgs.reduce((s, p) => s + Math.max(0, Number(p.total_price) - Number(p.total_paid)), 0)
            const creditDebt = credits.reduce((s, c) => s + Math.max(0, Number(c.total_amount) - Number(c.total_paid)), 0)
            const totalDebt = pkgDebt + creditDebt
            const debtLines: string[] = []
            pkgs.filter(p => Number(p.total_price) - Number(p.total_paid) > 0).forEach((p) => {
              debtLines.push(`  ${p.packages?.name || "Paket"}: ₺${(Number(p.total_price) - Number(p.total_paid)).toFixed(0)}`)
            })
            credits.filter(c => Number(c.total_amount) - Number(c.total_paid) > 0).forEach((c) => {
              debtLines.push(`  ${(c as any).services?.name || "Kredi"}: ₺${(Number(c.total_amount) - Number(c.total_paid)).toFixed(0)}`)
            })
            const parts = [`${customer.full_name} – Müşteri Özeti\n`]
            if (apptLines.length > 0) parts.push(`Yaklaşan Randevular:\n${apptLines.join("\n")}`)
            if (totalDebt > 0) parts.push(`\nKalan Borç: ₺${totalDebt.toFixed(0)}\n${debtLines.join("\n")}`)
            const summaryText = parts.join("\n")

            const calLink = (customer as any).calendar_token
              ? `${typeof window !== "undefined" ? window.location.origin : ""}/api/calendar/${(customer as any).calendar_token}`
              : null

            return (
              <div className="space-y-2 border-t border-slate-200 pt-3">
                {calLink && (
                  <div className="mb-3">
                    <p className="text-xs text-slate-500 mb-1.5 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> Takvim linki (Google/Apple/Outlook)
                    </p>
                    <div className="flex items-center gap-2">
                      <input readOnly value={calLink} className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600 truncate" />
                      <Button variant="outline" size="sm" onClick={() => {
                        navigator.clipboard.writeText(calLink)
                        setCalCopied(true); setTimeout(() => setCalCopied(false), 2000)
                      }}>
                        {calCopied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                      {customer.phone && (
                        <Button
                          size="sm"
                          className="gap-1.5 bg-blue-600 hover:bg-blue-700"
                          disabled={calSmsSending}
                          onClick={async () => {
                            setCalSmsSending(true)
                            try {
                              const res = await sendTestSmsAction(customer.phone, `Takvim linkiniz: ${calLink}`)
                              if (res.ok) {
                                setCalSmsSent(true)
                                setTimeout(() => setCalSmsSent(false), 2000)
                              }
                            } finally {
                              setCalSmsSending(false)
                            }
                          }}
                        >
                          {calSmsSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : calSmsSent ? <Check className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}
                          SMS
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => {
                      navigator.clipboard.writeText(summaryText)
                      setSummaryCopied(true); setTimeout(() => setSummaryCopied(false), 2000)
                    }}
                  >
                    {summaryCopied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {summaryCopied ? "Kopyalandı" : "Metni Kopyala"}
                  </Button>
                  {customer.phone && (
                    <a
                      href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(summaryText)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                    >
                      <Button size="sm" className="w-full gap-1.5 bg-green-600 hover:bg-green-700">
                        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                      </Button>
                    </a>
                  )}
                  {customer.phone && (
                    <Button
                      size="sm"
                      className="flex-1 gap-1.5 bg-blue-600 hover:bg-blue-700"
                      disabled={smsSending}
                      onClick={async () => {
                        setSmsSending(true)
                        try {
                          const res = await sendTestSmsAction(customer.phone, summaryText)
                          if (res.ok) {
                            setSmsSent(true)
                            setTimeout(() => setSmsSent(false), 2000)
                          }
                        } finally {
                          setSmsSending(false)
                        }
                      }}
                    >
                      {smsSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : smsSent ? <Check className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}
                      {smsSent ? "Gönderildi" : "SMS ile Gönder"}
                    </Button>
                  )}
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
              <Trash2 className="h-7 w-7 text-red-600" />
            </div>
            <div className="text-center">
              <h2 className="text-base font-semibold text-slate-800">Kaydı sil</h2>
              <p className="text-sm text-slate-500 mt-1">
                <span className="font-medium text-slate-700">{customer.full_name}</span> adlı müşteri kaydı
                ve tüm ilgili verileri kalıcı olarak silinecek. Bu işlem geri alınamaz.
              </p>
            </div>
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Vazgeç
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Evet, Sil
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
