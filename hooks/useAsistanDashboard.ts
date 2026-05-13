"use client"

import { useEffect, useState } from "react"
import { format, parseISO } from "date-fns"
import { tr } from "date-fns/locale"
import { supabase } from "@/lib/supabase-client"
import {
  type AsistanDatePreset,
  getDashboardRange,
  getBarChartWindow,
  buildIncomeBarSeries,
  formatBarLegend,
  type BarPoint,
} from "@/lib/asistan-range"
import type { AsistanTab } from "@/lib/asistan-tabs"

export type { AsistanTab } from "@/lib/asistan-tabs"

export type VatMode = "include" | "exclude"

const VAT_DIV = 1.2

const PIE_COLORS = [
  "#1e3a8a",
  "#2563eb",
  "#3b82f6",
  "#60a5fa",
  "#93c5fd",
  "#22c55e",
  "#86efac",
  "#f97316",
]

/** Primler — hizmet pastası (yeşil tonlar, örnek ekranla uyumlu) */
const PRIM_PIE_GREENS = ["#166534", "#15803d", "#16a34a", "#22c55e", "#4ade80", "#86efac"] as const

/** Giderler pastası — kahverengi / amber tonları */
const EXPENSE_PIE_COLORS = ["#7c2d12", "#92400e", "#b45309", "#c2410c", "#d97706", "#eab308"] as const

function financeExpenseMethodLabel(m: string | null | undefined) {
  const x = (m ?? "cash").toLowerCase()
  if (x === "pos") return "Kredi Kartı"
  if (x === "online") return "Online"
  return "Nakit"
}
const GUNCEL_SERVICE_REVENUE_BLUES = ["#0c4a6e", "#0369a1", "#0ea5e9", "#38bdf8", "#7dd3fc"] as const

function applyVat(n: number, mode: VatMode) {
  const x = Number(n) || 0
  return Math.round((mode === "exclude" ? x / VAT_DIV : x) * 100) / 100
}

function methodLabel(m: string) {
  switch (m) {
    case "cash":
      return "Nakit"
    case "card":
      return "Kredi Kartı"
    case "transfer":
      return "Havale/EFT"
    default:
      return m?.trim() ? m : "Diğer"
  }
}

export type FinancialRow = {
  id: string
  date: string
  customer: string
  service: string
  type: string
  balance: number
  total: number
}

/** Tahsilatlar kartı alt tablosu — ödeme satırları */
export type CollectionDetailRow = {
  id: string
  date: string
  methodLabel: string
  customer: string
  service: string
  serviceType: string
  amount: number
}

/** Finansal — manuel gider satırları (finance_transactions.type = expense) */
export type ExpenseDetailRow = {
  id: string
  date: string
  category: string
  description: string
  methodLabel: string
  amount: number
}

export type CustomerRegistrationBucket = "in_range" | "before" | "after"

export type CustomerRow = {
  id: string
  date: string
  name: string
  gender: string
  registrationBucket: CustomerRegistrationBucket
  totalApp: number
  onayApp: number
  bekApp: number
  tamApp: number
  cancelledApp: number
  balance: number
  earned: number
}

/** Müşteri sekmesi — Randevular kartı liste satırları */
export type AppointmentListRow = {
  id: string
  date: string
  customer: string
  service: string
  status: string
}

export type StaffRow = {
  employee: string
  service: string
  total: number
  onay: number
  bek: number
  tam: number
  iptal: number
}

/** Personel sekmesi — Gelire göre kartı alt tablosu (randevu satış + ödeme) */
export type StaffRevenueDetailRow = {
  id: string
  employee: string
  service: string
  paid: number
  balance: number
}

export type PieSeg = { name: string; value: number; color: string }

/** Primler sekmesi — hizmet / çalışan detay tabloları */
export type PrimServiceTableRow = {
  service: string
  totalRevenue: number
  ratePct: number
  primAmount: number
  periodLabel: string
}

export type PrimEmployeeTableRow = {
  employee: string
  totalRevenue: number
  ratePct: number
  primAmount: number
  periodLabel: string
}

export type AsistanDashboardData = {
  barData: BarPoint[]
  barLegend: { prev: string; cur: string }
  totalSales: number
  totalDiscount: number
  totalCollections: number
  remainingBalance: number
  avgPerCustomer: number
  collectionRatio: number
  appointmentPie: PieSeg[]
  customerPie: PieSeg[]
  servicePie: PieSeg[]
  genderPie: PieSeg[]
  collectionsByMethod: PieSeg[]
  receivablesTotal: number
  totalExpenses: number
  expensePie: PieSeg[]
  expenseRows: ExpenseDetailRow[]
  financialRows: FinancialRow[]
  customerRows: CustomerRow[]
  staffRows: StaffRow[]
  staffCountPie: PieSeg[]
  staffRevenuePie: PieSeg[]
  activeEmployees: number
  totalCustomers: number
  totalAppointments: number
  totalServiceAppointments: number
  primServiceCount: number
  primDistinctServiceCount: number
  primPieByService: PieSeg[]
  primBarSeries: { name: string; prim: number }[]
  primRowsByService: PrimServiceTableRow[]
  primRowsByEmployee: PrimEmployeeTableRow[]
  primPeriodLabel: string
  totalPrimEstimate: number
  receivablesPie: PieSeg[]
  serviceAppointmentPie: PieSeg[]
  collectionRows: CollectionDetailRow[]
  receivableRows: FinancialRow[]
  serviceAppointmentRows: FinancialRow[]
  appointmentRows: AppointmentListRow[]
  staffRevenueDetailRows: StaffRevenueDetailRow[]
}

const emptyDash: AsistanDashboardData = {
  barData: [],
  barLegend: { prev: "", cur: "" },
  totalSales: 0,
  totalDiscount: 0,
  totalCollections: 0,
  remainingBalance: 0,
  avgPerCustomer: 0,
  collectionRatio: 0,
  appointmentPie: [],
  customerPie: [],
  servicePie: [],
  genderPie: [],
  collectionsByMethod: [],
  receivablesTotal: 0,
  totalExpenses: 0,
  expensePie: [],
  expenseRows: [],
  financialRows: [],
  customerRows: [],
  staffRows: [],
  staffCountPie: [],
  staffRevenuePie: [],
  activeEmployees: 0,
  totalCustomers: 0,
  totalAppointments: 0,
  totalServiceAppointments: 0,
  primServiceCount: 0,
  primDistinctServiceCount: 0,
  primPieByService: [],
  primBarSeries: [],
  primRowsByService: [],
  primRowsByEmployee: [],
  primPeriodLabel: "",
  totalPrimEstimate: 0,
  receivablesPie: [],
  serviceAppointmentPie: [],
  collectionRows: [],
  receivableRows: [],
  serviceAppointmentRows: [],
  appointmentRows: [],
  staffRevenueDetailRows: [],
}

function trimPieToMax(segments: PieSeg[], max = 5): PieSeg[] {
  const pos = segments.filter((s) => s.value > 0)
  if (pos.length <= max) return pos
  const top = [...pos].sort((a, b) => b.value - a.value)
  const head = top.slice(0, max - 1)
  const tail = top.slice(max - 1)
  const restVal = tail.reduce((s, x) => s + x.value, 0)
  const out = [...head]
  if (restVal > 0) out.push({ name: "Diğer", value: restVal, color: "#94a3b8" })
  return out.slice(0, max)
}

type ApptRow = {
  id: string
  appointment_date: string
  start_time: string | null
  price: number | null
  discount: number | null
  status: string
  customer_id: string
  service_id: string
  employee_id: string
  customers: { id: string; full_name: string; created_at: string; gender: string | null } | null
  services: { id: string; name: string } | null
}

function embedOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

function apptSortKey(a: ApptRow): string {
  const raw = (a.start_time && String(a.start_time).trim()) || "12:00:00"
  const t = raw.length === 5 ? `${raw}:00` : raw
  return format(parseISO(`${a.appointment_date}T${t}`), "yyyy-MM-dd'T'HH:mm:ss")
}

function paketSatisiLabelFromNotes(notes: string | null | undefined): string {
  const n = notes?.trim()
  if (n && /paket/i.test(n))
    return n.replace(/^\[DEMO\]\s*/i, "").trim()
  return "(DEMO) Paket satışı"
}

/**
 * Hizmet adı: düz metin veya JSON `{"tr":"..."}` (Supabase / çok dillı alan)
 */
export function displayServiceName(raw: string | null | undefined): string {
  const s = (raw ?? "").trim()
  if (!s) return "—"
  if (s.startsWith("{")) {
    try {
      const j = JSON.parse(s) as Record<string, string>
      const v = j.tr ?? j.en ?? Object.values(j).find((x) => typeof x === "string")
      const out = typeof v === "string" ? v.trim() : ""
      return out || "—"
    } catch {
      return s
    }
  }
  return s
}

/** Hizmet adı paket satışına mı bağlı — Satışlar / borç dağılımı iki renk için */
function isPaketServiceName(name: string) {
  return /paket/i.test((name ?? "").trim())
}

type PayRow = {
  id: string
  amount: number | null
  method: string | null
  paid_at: string
  appointment_id: string | null
  customer_id: string
  notes: string | null
  customers: { full_name: string } | null
}

function mapPaymentRow(raw: unknown): PayRow {
  const r = raw as {
    id: string
    amount: number | null
    method: string | null
    paid_at: string
    appointment_id: string | null
    customer_id: string
    notes: string | null
    customers: { full_name: string } | { full_name: string }[] | null
  }
  return {
    id: r.id,
    amount: r.amount,
    method: r.method,
    paid_at: r.paid_at,
    appointment_id: r.appointment_id,
    customer_id: r.customer_id,
    notes: r.notes,
    customers: embedOne(r.customers),
  }
}

const PAY_SELECT =
  "id, amount, method, paid_at, appointment_id, customer_id, notes, customers ( full_name )" as const

type EmpRow = { id: string; full_name: string }

type CommissionRuleRow = {
  employee_id: string | null
  service_id: string | null
  rate: number | null
  scope: string | null
  is_active: boolean | null
}

function normStatus(s: string) {
  return (s || "").trim().toLowerCase()
}

export function isIptalAppointment(s: string) {
  const x = normStatus(s)
  return x === "iptal" || x === "cancelled"
}

function isBeklemedeAppointment(s: string) {
  const x = normStatus(s)
  return x === "beklemede" || x === "pending"
}

function isTamamlandiAppointment(s: string) {
  const x = normStatus(s)
  return x === "tamamlandi" || x === "completed"
}

function isOnaylandiAppointment(s: string) {
  const x = normStatus(s)
  return x === "onaylandi" || x === "approved"
}

/** Randevu listesi için durum etiketi — üst pasta dilimleriyle uyumlu */
function apptDurumEtiketi(status: string): string {
  if (isIptalAppointment(status)) return "İptal edilen"
  if (isBeklemedeAppointment(status)) return "Beklemede"
  if (isTamamlandiAppointment(status)) return "Tamamlanan"
  if (isOnaylandiAppointment(status)) return "Onaylanan"
  return "Diğer"
}

/** Satış tutarı olan randevular (takvim: onaylandi / tamamlandi) */
function countsAsRevenueAppointment(s: string) {
  if (isIptalAppointment(s) || isBeklemedeAppointment(s)) return false
  return isOnaylandiAppointment(s) || isTamamlandiAppointment(s)
}

function pickCommissionRate(rules: CommissionRuleRow[], employeeId: string, serviceId: string): number {
  const pool = rules.filter((r) => r.employee_id === employeeId)
  const hit = pool.find((r) => r.service_id === serviceId) ?? pool.find((r) => r.service_id === null || r.service_id === undefined)
  const pct = Number(hit?.rate ?? 0)
  return Number.isFinite(pct) ? pct : 0
}

export function useAsistanDashboard(
  companyId: string | null,
  preset: AsistanDatePreset,
  vatMode: VatMode,
  activeTab: AsistanTab = "guncel"
) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AsistanDashboardData>(emptyDash)

  useEffect(() => {
    if (!companyId) {
      setLoading(false)
      setData(emptyDash)
      setError(null)
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      const range = getDashboardRange(preset)
      const barW = getBarChartWindow(preset, range)
      const rangePayFrom = range.start.toISOString()
      const rangePayTo = range.end.toISOString()
      const payFrom = barW.prevStart.toISOString()
      const payTo = barW.curEnd.toISOString()

      const APT_SELECT = `
              id,
              appointment_date,
              start_time,
              price,
              discount,
              status,
              customer_id,
              service_id,
              employee_id,
              customers ( id, full_name, created_at, gender ),
              services ( id, name )
            `

      try {
        const { data: payLinkRaw, error: eLink } = await supabase
          .from("payments")
          .select("appointment_id")
          .eq("company_id", companyId)
          .gte("paid_at", rangePayFrom)
          .lte("paid_at", rangePayTo)

        if (eLink) throw eLink

        const linkedApptIds = Array.from(
          new Set(
            (payLinkRaw ?? [])
              .map((r) => (r as { appointment_id: string | null }).appointment_id)
              .filter((id): id is string => typeof id === "string" && id.length > 0)
          )
        )

        let apptsReq = supabase.from("appointments").select(APT_SELECT).eq("company_id", companyId)
        if (linkedApptIds.length > 0) {
          apptsReq = apptsReq.or(
            `and(appointment_date.gte.${range.apptStart},appointment_date.lte.${range.apptEnd}),id.in.(${linkedApptIds.join(",")})`
          )
        } else {
          apptsReq = apptsReq.gte("appointment_date", range.apptStart).lte("appointment_date", range.apptEnd)
        }

        const [{ data: apptsRaw, error: eAp }, { data: empsRaw, error: eEm }] = await Promise.all([
          apptsReq,
          supabase.from("employees").select("id, full_name").eq("company_id", companyId).eq("status", "active"),
        ])

        if (eAp) throw eAp
        if (eEm) throw eEm

        const needCommissionRules = activeTab === "primler"
        const needCustomersWide = activeTab === "guncel" || activeTab === "finansal" || activeTab === "musteri"
        const needPaymentsBar = activeTab === "guncel" || activeTab === "finansal"

        let rules: CommissionRuleRow[] = []
        if (needCommissionRules) {
          const { data: rulesRaw, error: eRu } = await supabase
            .from("commission_rules")
            .select("employee_id, service_id, rate, scope, is_active")
            .eq("company_id", companyId)
            .eq("is_active", true)
          if (eRu) throw eRu
          rules = (rulesRaw ?? []) as CommissionRuleRow[]
        }

        const appts: ApptRow[] = (apptsRaw ?? []).map((raw: unknown) => {
          const r = raw as Omit<ApptRow, "customers" | "services"> & {
            customers: ApptRow["customers"] | NonNullable<ApptRow["customers"]>[] | null
            services: ApptRow["services"] | NonNullable<ApptRow["services"]>[] | null
          }
          return {
            ...r,
            customers: embedOne(r.customers),
            services: embedOne(r.services),
          }
        })
        const emps = (empsRaw ?? []) as EmpRow[]
        const empName = new Map(emps.map((e) => [e.id, e.full_name]))

        const apptIds = appts.map((a) => a.id)

        let paymentsBar: PayRow[] = []
        let paymentsInRange: PayRow[] = []
        let paymentsForBalance: PayRow[] = []

        if (needPaymentsBar) {
          const payQuery = supabase
            .from("payments")
            .select(PAY_SELECT)
            .eq("company_id", companyId)
            .gte("paid_at", payFrom)
            .lte("paid_at", payTo)

          const { data: pBar, error: ePb } = await payQuery
          if (ePb) throw ePb
          paymentsBar = (pBar ?? []).map(mapPaymentRow)
        }

        const { data: pRg, error: ePr } = await supabase
          .from("payments")
          .select(PAY_SELECT)
          .eq("company_id", companyId)
          .gte("paid_at", rangePayFrom)
          .lte("paid_at", rangePayTo)

        if (ePr) throw ePr
        paymentsInRange = (pRg ?? []).map(mapPaymentRow)

        if (apptIds.length > 0) {
          const { data: pBal, error: eBal } = await supabase
            .from("payments")
            .select(PAY_SELECT)
            .eq("company_id", companyId)
            .in("appointment_id", apptIds)

          if (eBal) throw eBal
          paymentsForBalance = (pBal ?? []).map(mapPaymentRow)
        }

        const paidByAppt = new Map<string, number>()
        for (const p of paymentsForBalance) {
          if (!p.appointment_id) continue
          paidByAppt.set(
            p.appointment_id,
            (paidByAppt.get(p.appointment_id) ?? 0) + applyVat(Number(p.amount) || 0, vatMode)
          )
        }

        type Buck = {
          employee: string
          service: string
          total: number
          onay: number
          bek: number
          tam: number
          iptal: number
        }

        let totalSales = 0
        let totalDiscount = 0
        let remainingBalance = 0
        let salesBireysel = 0
        let salesPaket = 0
        let salesUrun = 0
        let balanceBireysel = 0
        let balancePaket = 0
        const customerIdsInRange = new Set<string>()
        let nOnay = 0
        let nBek = 0
        let nTam = 0
        let nIptal = 0
        let primApptHits = 0

        const staffAgg = new Map<string, Buck>()
        const financialRows: { row: FinancialRow; sort: string }[] = []
        const staffRevenueDetailAgg: { row: StaffRevenueDetailRow; sort: string }[] = []
        const primByEmp = new Map<string, number>()
        const primByServiceAgg = new Map<string, { gelir: number; prim: number; hits: number }>()
        const primByEmpAgg = new Map<string, { gelir: number; prim: number }>()

        const bumpStaff = (empId: string, svcName: string, empNm: string, kind: "onay" | "bek" | "tam" | "iptal") => {
          const k = `${empId}::${svcName}`
          const cur = staffAgg.get(k) ?? {
            employee: empNm,
            service: svcName,
            total: 0,
            onay: 0,
            bek: 0,
            tam: 0,
            iptal: 0,
          }
          cur.total += 1
          if (kind === "onay") cur.onay += 1
          else if (kind === "bek") cur.bek += 1
          else if (kind === "tam") cur.tam += 1
          else cur.iptal += 1
          staffAgg.set(k, cur)
        }

        for (const a of appts) {
          const price = applyVat(Number(a.price) || 0, vatMode)
          const disc = applyVat(Number(a.discount) || 0, vatMode)
          const net = Math.max(0, price - disc)
          const custName = a.customers?.full_name ?? "—"
          const svcRaw =
            a.services?.name != null ? String(a.services.name).trim() : ""
          const svcDisplay = displayServiceName(svcRaw || null)
          const empNm = empName.get(a.employee_id) ?? "—"

          if (isIptalAppointment(a.status)) {
            nIptal += 1
            bumpStaff(a.employee_id, svcDisplay, empNm, "iptal")
            continue
          }
          if (isBeklemedeAppointment(a.status)) {
            nBek += 1
            bumpStaff(a.employee_id, svcDisplay, empNm, "bek")
            continue
          }

          if (isTamamlandiAppointment(a.status)) {
            nTam += 1
            bumpStaff(a.employee_id, svcDisplay, empNm, "tam")
          } else if (isOnaylandiAppointment(a.status)) {
            nOnay += 1
            bumpStaff(a.employee_id, svcDisplay, empNm, "onay")
          } else {
            nOnay += 1
            bumpStaff(a.employee_id, svcDisplay, empNm, "onay")
          }

          if (!countsAsRevenueAppointment(a.status)) continue

          totalSales += net
          totalDiscount += disc
          const paid = paidByAppt.get(a.id) ?? 0
          const bal = Math.max(0, net - paid)
          remainingBalance += bal
          customerIdsInRange.add(a.customer_id)

          if (isPaketServiceName(svcDisplay)) {
            salesPaket += net
            balancePaket += bal
          } else {
            salesBireysel += net
            balanceBireysel += bal
          }

          financialRows.push({
            row: {
              id: a.id,
              date: format(parseISO(a.appointment_date + "T12:00:00"), "dd.MM.yyyy", {
                locale: tr,
              }),
              customer: custName,
              service: svcDisplay,
              type: isPaketServiceName(svcDisplay) ? "Paket" : "Bireysel",
              balance: bal,
              total: net,
            },
            sort: apptSortKey(a),
          })

          staffRevenueDetailAgg.push({
            row: {
              id: a.id,
              employee: empNm,
              service: svcDisplay,
              paid,
              balance: bal,
            },
            sort: apptSortKey(a),
          })

          const rate = needCommissionRules ? pickCommissionRate(rules, a.employee_id, a.service_id) : 0
          if (rate > 0) {
            const prim = Math.round(net * (rate / 100) * 100) / 100
            primByEmp.set(a.employee_id, (primByEmp.get(a.employee_id) ?? 0) + prim)
            const ps = primByServiceAgg.get(svcDisplay) ?? { gelir: 0, prim: 0, hits: 0 }
            ps.gelir += net
            ps.prim += prim
            ps.hits += 1
            primByServiceAgg.set(svcDisplay, ps)
            const pe = primByEmpAgg.get(a.employee_id) ?? { gelir: 0, prim: 0 }
            pe.gelir += net
            pe.prim += prim
            primByEmpAgg.set(a.employee_id, pe)
            primApptHits += 1
          }
        }

        for (const p of paymentsInRange) {
          if (p.appointment_id) continue
          const net = applyVat(Number(p.amount) || 0, vatMode)
          totalSales += net
          customerIdsInRange.add(p.customer_id)
          const svcLabel = paketSatisiLabelFromNotes(p.notes)

          salesPaket += net

          financialRows.push({
            row: {
              id: p.id,
              date: format(parseISO(p.paid_at), "dd.MM.yyyy", { locale: tr }),
              customer: p.customers?.full_name ?? "—",
              service: svcLabel,
              type: "Paket",
              balance: 0,
              total: net,
            },
            sort: format(parseISO(p.paid_at), "yyyy-MM-dd'T'HH:mm:ss"),
          })
        }

        // Product sales (Ürün)
        const { data: prodSalesRaw } = await supabase
          .from("product_sales")
          .select("id, total_amount, discount, customer_id, sold_at, notes, customers(full_name)")
          .eq("company_id", companyId)
          .gte("sold_at", rangePayFrom)
          .lte("sold_at", rangePayTo)

        for (const ps of (prodSalesRaw ?? []) as unknown as { id: string; total_amount: number; discount: number; customer_id: string; sold_at: string; notes: string | null; customers: { full_name: string } | null }[]) {
          const amount = applyVat(Number(ps.total_amount) || 0, vatMode)
          const disc = applyVat(Number(ps.discount) || 0, vatMode)
          const net = Math.max(0, amount - disc)
          totalSales += net
          salesUrun += net
          if (ps.customer_id) customerIdsInRange.add(ps.customer_id)

          financialRows.push({
            row: {
              id: ps.id,
              date: format(parseISO(ps.sold_at), "dd.MM.yyyy", { locale: tr }),
              customer: ps.customers?.full_name ?? "—",
              service: ps.notes || "Ürün satışı",
              type: "Ürün",
              balance: 0,
              total: net,
            },
            sort: format(parseISO(ps.sold_at), "yyyy-MM-dd'T'HH:mm:ss"),
          })
        }

        const totalCollections = paymentsInRange.reduce(
          (s, p) => s + applyVat(Number(p.amount) || 0, vatMode),
          0
        )

        const distinctCustomers = customerIdsInRange.size
        const avgPerCustomer =
          distinctCustomers > 0 ? Math.round((totalSales / distinctCustomers) * 100) / 100 : 0

        const collectionRatio = totalSales > 0 ? Math.min(1, totalCollections / totalSales) : 0

        const barPayments = paymentsBar.map((p) => ({
          paidAt: new Date(p.paid_at),
          amount: applyVat(Number(p.amount) || 0, vatMode),
        }))
        const barData = buildIncomeBarSeries(barPayments, preset, range, barW)
        const barLegend = formatBarLegend(preset, barW)

        const appointmentPie: PieSeg[] = trimPieToMax(
          [
            ...(nOnay > 0 ? [{ name: "Onaylanan", value: nOnay, color: "#0095FF" } as PieSeg] : []),
            ...(nBek > 0 ? [{ name: "Beklemede", value: nBek, color: "#f97316" }] : []),
            ...(nTam > 0 ? [{ name: "Tamamlanan", value: nTam, color: "#22c55e" }] : []),
            ...(nIptal > 0 ? [{ name: "İptal edilen", value: nIptal, color: "#ef4444" }] : []),
          ].filter((s) => s.value > 0)
        )

        const { data: custRowsRaw, error: eCust } = needCustomersWide
          ? await supabase.from("customers").select("id, created_at").eq("company_id", companyId)
          : { data: null as unknown, error: null as null }

        if (eCust) throw eCust
        const custRows = (custRowsRaw ?? []) as { id: string; created_at: string }[]

        const rangeStartMs = range.start.getTime()
        const rangeEndMs = range.end.getTime()
        let newInRange = 0
        let beforeRange = 0
        let afterRange = 0
        for (const c of custRows) {
          const ct = new Date(c.created_at).getTime()
          if (ct < rangeStartMs) beforeRange += 1
          else if (ct <= rangeEndMs) newInRange += 1
          else afterRange += 1
        }

        const customerPie: PieSeg[] = trimPieToMax(
          [
            ...(newInRange > 0 ? [{ name: "Seçili tarih", value: newInRange, color: "#0369a1" }] : []),
            ...(beforeRange > 0 ? [{ name: "Seçili tarih öncesi", value: beforeRange, color: "#7dd3fc" }] : []),
            ...(afterRange > 0 ? [{ name: "Dönem sonrası kayıt", value: afterRange, color: "#cbd5e1" }] : []),
          ].filter((s) => s.value > 0)
        )

        const EPS = 0.004
        const round2 = (n: number) => Math.round(n * 100) / 100

        const servicePie: PieSeg[] = trimPieToMax(
          [
            ...(salesBireysel > EPS ? [{ name: "Bireysel", value: round2(salesBireysel), color: "#1e40af" } as PieSeg] : []),
            ...(salesPaket > EPS ? [{ name: "Paket", value: round2(salesPaket), color: "#38bdf8" }] : []),
            ...(salesUrun > EPS ? [{ name: "Ürün", value: round2(salesUrun), color: "#22c55e" }] : []),
          ],
          5
        )

        const methodTotals = new Map<string, number>()
        for (const p of paymentsInRange) {
          const k = p.method || "cash"
          methodTotals.set(k, (methodTotals.get(k) ?? 0) + applyVat(Number(p.amount) || 0, vatMode))
        }
        const collectionsByMethod: PieSeg[] = trimPieToMax(
          Array.from(methodTotals.entries())
            .filter(([, v]) => v > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([m, value], i) => ({
              name: methodLabel(m),
              value,
              color: PIE_COLORS[(i + 2) % PIE_COLORS.length],
            }))
        )

        const genderCount = new Map<string, number>()
        for (const a of appts) {
          const g = a.customers?.gender?.trim() || "Belirtilmemiş"
          genderCount.set(g, (genderCount.get(g) ?? 0) + 1)
        }
        const genderPie: PieSeg[] = trimPieToMax(
          Array.from(genderCount.entries()).map(([name, value], i) => ({
            name,
            value,
            color: PIE_COLORS[i % PIE_COLORS.length],
          }))
        )

        const earnedByCustomer = new Map<string, number>()
        for (const p of paymentsInRange) {
          earnedByCustomer.set(
            p.customer_id,
            (earnedByCustomer.get(p.customer_id) ?? 0) + applyVat(Number(p.amount) || 0, vatMode)
          )
        }

        const balanceByCustomer = new Map<string, number>()
        for (const { row: fr } of financialRows) {
          const at = appts.find((x) => x.id === fr.id)
          if (!at) continue
          balanceByCustomer.set(
            at.customer_id,
            (balanceByCustomer.get(at.customer_id) ?? 0) + fr.balance
          )
        }

        const custBuckets = new Map<string, { onay: number; bek: number; tam: number; ipt: number }>()
        for (const a of appts) {
          const id = a.customer_id
          const row = custBuckets.get(id) ?? { onay: 0, bek: 0, tam: 0, ipt: 0 }
          if (isIptalAppointment(a.status)) row.ipt += 1
          else if (isBeklemedeAppointment(a.status)) row.bek += 1
          else if (isTamamlandiAppointment(a.status)) row.tam += 1
          else row.onay += 1
          custBuckets.set(id, row)
        }

        const customerRows: CustomerRow[] = []
        const seenCust = new Set<string>()
        for (const a of appts) {
          if (seenCust.has(a.customer_id)) continue
          seenCust.add(a.customer_id)
          const c = a.customers
          const b = custBuckets.get(a.customer_id) ?? { onay: 0, bek: 0, tam: 0, ipt: 0 }
          const totalApp = b.onay + b.bek + b.tam + b.ipt

          let registrationBucket: CustomerRegistrationBucket = "before"
          if (c?.created_at) {
            const ct = new Date(c.created_at).getTime()
            if (ct > rangeEndMs) registrationBucket = "after"
            else if (ct >= rangeStartMs) registrationBucket = "in_range"
            else registrationBucket = "before"
          }

          customerRows.push({
            id: a.customer_id,
            date: c?.created_at
              ? format(parseISO(c.created_at), "dd.MM.yyyy", { locale: tr })
              : "—",
            name: c?.full_name ?? "—",
            gender: c?.gender?.trim() || "Belirtilmemiş",
            registrationBucket,
            totalApp,
            onayApp: b.onay,
            bekApp: b.bek,
            tamApp: b.tam,
            cancelledApp: b.ipt,
            balance: balanceByCustomer.get(a.customer_id) ?? 0,
            earned: earnedByCustomer.get(a.customer_id) ?? 0,
          })
        }
        customerRows.sort((a, b) => a.name.localeCompare(b.name, "tr"))

        const appointmentRows: AppointmentListRow[] = [...appts]
          .sort((a, b) => apptSortKey(b).localeCompare(apptSortKey(a)))
          .map((a) => ({
            id: a.id,
            date: format(parseISO(a.appointment_date + "T12:00:00"), "dd.MM.yyyy", { locale: tr }),
            customer: a.customers?.full_name ?? "—",
            service: displayServiceName(
              a.services?.name != null ? String(a.services.name) : "",
            ),
            status: apptDurumEtiketi(a.status),
          }))

        const receivablesPie: PieSeg[] = trimPieToMax(
          [
            ...(balanceBireysel > EPS ? [{ name: "Bireysel", value: round2(balanceBireysel), color: "#78350f" } as PieSeg] : []),
            ...(balancePaket > EPS ? [{ name: "Paket", value: round2(balancePaket), color: "#ea580c" }] : []),
          ],
          5
        )

        /** Paket tek dilim — diğer hizmetler sayıma göre, en fazla 3 dilim */
        const svcApptPaket = appts.reduce(
          (n, a) =>
            n +
            (isPaketServiceName(
              displayServiceName(
                a.services?.name != null ? String(a.services.name) : "",
              ),
            )
              ? 1
              : 0),
          0,
        )
        const svcApptOtherMap = new Map<string, number>()
        for (const a of appts) {
          const sn = displayServiceName(a.services?.name != null ? String(a.services.name) : "")
          if (isPaketServiceName(sn)) continue
          svcApptOtherMap.set(sn, (svcApptOtherMap.get(sn) ?? 0) + 1)
        }
        const otherSvcSorted = Array.from(svcApptOtherMap.entries())
          .filter(([, v]) => v > 0)
          .sort((a, b) => b[1] - a[1])

        const serviceAppointmentPie: PieSeg[] = (() => {
          const CAP = 3
          const slices: PieSeg[] = []
          if (svcApptPaket > 0) {
            slices.push({
              name: "Paket",
              value: svcApptPaket,
              color: GUNCEL_SERVICE_REVENUE_BLUES[0],
            })
          }
          for (const [svcName, cnt] of otherSvcSorted) {
            if (slices.length >= CAP) break
            slices.push({
              name: svcName,
              value: cnt,
              color: GUNCEL_SERVICE_REVENUE_BLUES[slices.length % GUNCEL_SERVICE_REVENUE_BLUES.length],
            })
          }
          return slices
        })()

        const staffRows: StaffRow[] = Array.from(staffAgg.values())
          .map((r) => ({
            employee: r.employee,
            service: r.service,
            total: r.total,
            onay: r.onay,
            bek: r.bek,
            tam: r.tam,
            iptal: r.iptal,
          }))
          .sort((a, b) => a.employee.localeCompare(b.employee, "tr"))

        const cntByEmp = new Map<string, number>()
        const revByEmp = new Map<string, number>()
        for (const a of appts) {
          const eid = a.employee_id
          cntByEmp.set(eid, (cntByEmp.get(eid) ?? 0) + 1)
          if (!countsAsRevenueAppointment(a.status)) continue
          const price = applyVat(Number(a.price) || 0, vatMode)
          const disc = applyVat(Number(a.discount) || 0, vatMode)
          const net = Math.max(0, price - disc)
          revByEmp.set(eid, (revByEmp.get(eid) ?? 0) + net)
        }

        const staffCountPie: PieSeg[] = trimPieToMax(
          Array.from(cntByEmp.entries())
            .filter(([, v]) => v > 0)
            .map(([eid, value], i) => ({
              name: empName.get(eid) ?? "—",
              value,
              color: PIE_COLORS[i % PIE_COLORS.length],
            }))
        )

        const staffRevenuePie: PieSeg[] = trimPieToMax(
          Array.from(revByEmp.entries())
            .filter(([, v]) => v > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([eid, value], i) => ({
              name: empName.get(eid) ?? "—",
              value,
              color: PIE_COLORS[i % PIE_COLORS.length],
            }))
        )

        const primPeriodRaw = format(range.start, "MMMM yyyy", { locale: tr })
        const primPeriodLabel =
          primPeriodRaw.length > 0
            ? primPeriodRaw.charAt(0).toLocaleUpperCase("tr") + primPeriodRaw.slice(1)
            : ""

        const primPieByService: PieSeg[] = trimPieToMax(
          Array.from(primByServiceAgg.entries())
            .filter(([, agg]) => agg.hits > 0)
            .sort((a, b) => b[1].hits - a[1].hits)
            .map(([name, agg], i) => ({
              name,
              value: agg.hits,
              color: PRIM_PIE_GREENS[i % PRIM_PIE_GREENS.length],
            })),
        )

        const primBarSeries = Array.from(primByEmp.entries())
          .filter(([, v]) => v > EPS)
          .sort((a, b) => b[1] - a[1])
          .map(([eid, prim]) => ({
            name: empName.get(eid) ?? "—",
            prim: round2(prim),
          }))

        const primRowsByService: PrimServiceTableRow[] = Array.from(primByServiceAgg.entries())
          .filter(([, agg]) => agg.prim > EPS)
          .sort((a, b) => b[1].prim - a[1].prim)
          .map(([service, agg]) => ({
            service,
            totalRevenue: round2(agg.gelir),
            ratePct:
              agg.gelir > 0 ? Math.round((agg.prim / agg.gelir) * 10000) / 100 : 0,
            primAmount: round2(agg.prim),
            periodLabel: primPeriodLabel,
          }))

        const primRowsByEmployee: PrimEmployeeTableRow[] = Array.from(primByEmpAgg.entries())
          .filter(([, agg]) => agg.prim > EPS)
          .sort((a, b) => b[1].prim - a[1].prim)
          .map(([eid, agg]) => ({
            employee: empName.get(eid) ?? "—",
            totalRevenue: round2(agg.gelir),
            ratePct:
              agg.gelir > 0 ? Math.round((agg.prim / agg.gelir) * 10000) / 100 : 0,
            primAmount: round2(agg.prim),
            periodLabel: primPeriodLabel,
          }))

        const primDistinctServiceCount = primByServiceAgg.size

        const totalPrimEstimate =
          Math.round(Array.from(primByEmp.values()).reduce((s, x) => s + x, 0) * 100) / 100

        const totalCustomersCompany = custRows.length
        const totalAppointments = appts.length
        const totalServiceAppointments = nOnay + nTam

        const salesSorted = [...financialRows]
          .sort((a, b) => b.sort.localeCompare(a.sort))
          .map((x) => x.row)

        const staffRevenueDetailRows = [...staffRevenueDetailAgg]
          .sort((a, b) => b.sort.localeCompare(a.sort))
          .map((x) => x.row)

        const receivableRows = salesSorted.filter((r) => r.balance > EPS)

        const serviceAppointmentAgg: { row: FinancialRow; sort: string }[] = []
        for (const a of appts) {
          if (isIptalAppointment(a.status) || isBeklemedeAppointment(a.status)) continue

          const price = applyVat(Number(a.price) || 0, vatMode)
          const disc = applyVat(Number(a.discount) || 0, vatMode)
          const net = Math.max(0, price - disc)
          const paid = paidByAppt.get(a.id) ?? 0
          const bal = Math.max(0, net - paid)

          const custName = a.customers?.full_name ?? "—"
          const svcDisplay = displayServiceName(
            a.services?.name != null ? String(a.services.name) : "",
          )

          serviceAppointmentAgg.push({
            row: {
              id: a.id,
              date: format(parseISO(a.appointment_date + "T12:00:00"), "dd.MM.yyyy", { locale: tr }),
              customer: custName,
              service: svcDisplay,
              type: isPaketServiceName(svcDisplay) ? "Paket" : "Bireysel",
              balance: bal,
              total: net,
            },
            sort: apptSortKey(a),
          })
        }
        const serviceAppointmentRows = serviceAppointmentAgg
          .sort((a, b) => b.sort.localeCompare(a.sort))
          .map((x) => x.row)

        const collectionRows: CollectionDetailRow[] = [...paymentsInRange]
          .sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime())
          .map((p) => {
            const amount = applyVat(Number(p.amount) || 0, vatMode)
            const cust = p.customers?.full_name ?? "—"
            let service = "—"
            let serviceType = "Paket"

            if (p.appointment_id) {
              const ax = appts.find((x) => x.id === p.appointment_id)
              if (ax) {
                const sn = displayServiceName(
                  ax.services?.name != null ? String(ax.services.name) : "",
                )
                service = sn
                serviceType = isPaketServiceName(sn) ? "Paket" : "Bireysel"
              } else {
                serviceType = "Bireysel"
              }
            } else {
              service = paketSatisiLabelFromNotes(p.notes)
              serviceType = "Paket"
            }

            return {
              id: p.id,
              date: format(parseISO(p.paid_at), "dd.MM.yyyy", { locale: tr }),
              methodLabel: methodLabel(p.method ?? "cash"),
              customer: cust,
              service,
              serviceType,
              amount,
            }
          })

        const needFinanceExpenses = activeTab === "finansal"
        let totalExpenses = 0
        let expensePie: PieSeg[] = []
        let expenseRows: ExpenseDetailRow[] = []

        if (needFinanceExpenses) {
          const { data: expRaw, error: eExp } = await supabase
            .from("finance_transactions")
            .select("id, created_at, category, amount, description, payment_method")
            .eq("company_id", companyId)
            .eq("type", "expense")
            .gte("created_at", rangePayFrom)
            .lte("created_at", rangePayTo)
            .order("created_at", { ascending: false })

          if (eExp) throw eExp

          type ExpRaw = {
            id: string
            created_at: string
            category: string
            amount: unknown
            description: string | null
            payment_method: string | null
          }
          const rawList = (expRaw ?? []) as ExpRaw[]

          const byCat = new Map<string, number>()
          let sumExp = 0
          for (const r of rawList) {
            const n = Math.round(Number(r.amount) * 100) / 100
            if (!Number.isFinite(n) || n < 0) continue
            sumExp += n
            const cat = (r.category ?? "").trim() || "Diğer"
            byCat.set(cat, (byCat.get(cat) ?? 0) + n)
          }
          totalExpenses = Math.round(sumExp * 100) / 100

          expensePie = trimPieToMax(
            Array.from(byCat.entries())
              .filter(([, v]) => v > EPS)
              .sort((a, b) => b[1] - a[1])
              .map(([name, value], i) => ({
                name,
                value: round2(value),
                color: EXPENSE_PIE_COLORS[i % EXPENSE_PIE_COLORS.length],
              })),
          )

          expenseRows = rawList.map((r) => {
            const n = Math.round(Number(r.amount) * 100) / 100
            return {
              id: r.id,
              date: format(parseISO(r.created_at), "dd.MM.yyyy", { locale: tr }),
              category: (r.category ?? "").trim() || "Diğer",
              amount: Number.isFinite(n) && n >= 0 ? n : 0,
              description: (r.description ?? "").trim() || "—",
              methodLabel: financeExpenseMethodLabel(r.payment_method),
            }
          })
        }

        if (!cancelled) {
          setData({
            barData,
            barLegend,
            totalSales,
            totalDiscount,
            totalCollections,
            remainingBalance,
            avgPerCustomer,
            collectionRatio,
            appointmentPie,
            customerPie,
            servicePie,
            genderPie,
            collectionsByMethod,
            receivablesTotal: remainingBalance,
            totalExpenses,
            expensePie,
            expenseRows,
            financialRows: salesSorted,
            customerRows,
            staffRows,
            staffCountPie,
            staffRevenuePie,
            activeEmployees: emps.length,
            totalCustomers: totalCustomersCompany,
            totalAppointments,
            totalServiceAppointments,
            primServiceCount: primApptHits,
            primDistinctServiceCount,
            primPieByService,
            primBarSeries,
            primRowsByService,
            primRowsByEmployee,
            primPeriodLabel,
            totalPrimEstimate,
            receivablesPie,
            serviceAppointmentPie,
            collectionRows,
            receivableRows,
            serviceAppointmentRows,
            appointmentRows,
            staffRevenueDetailRows,
          })
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Veri yüklenemedi")
          setData(emptyDash)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [companyId, preset, vatMode, activeTab])

  return { loading, error, data }
}
