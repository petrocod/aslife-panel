/**
 * Demo tohum verisi — yalnızca DEMO şirket UUID (00000000-...) için.
 * Silme: bu şirkete ait (company_id) tüm operasyonel satırlar; company + settings + working_hours kalır.
 */
import {
  addDays,
  eachDayOfInterval,
  format,
  parseISO,
  setHours,
  setMinutes,
  startOfDay,
} from "date-fns"

import type { SupabaseClient } from "@supabase/supabase-js"

import { DEMO_COMPANY_ID, DEMO_SEED_APPOINTMENT_BUDGET } from "@/lib/demo-limits"

export const DEMO_COMPANY_UUID = DEMO_COMPANY_ID
const EMAIL_MARK = "@demo-seed.invalid"

const LOC = {
  a: "a1111111-b111-4111-a111-111111110001",
  b: "a1111111-b111-4111-a111-111111110002",
} as const

const EMP = {
  e1: "b2222222-c222-4222-b222-222222220001",
  e2: "b2222222-c222-4222-b222-222222220002",
  e3: "b2222222-c222-4222-b222-222222220003",
  e4: "b2222222-c222-4222-b222-222222220004",
} as const

const SVC = {
  s1: "c3333333-d333-4333-c333-333333330001",
  s2: "c3333333-d333-4333-c333-333333330002",
  s3: "c3333333-d333-4333-c333-333333330003",
  s4: "c3333333-d333-4333-c333-333333330004",
  s5: "c3333333-d333-4333-c333-333333330005",
} as const

const PKG = {
  p1: "d4444444-e444-4444-d444-444444440001",
  p2: "d4444444-e444-4444-d444-444444440002",
} as const

/** demo-musteri-1 … 12 için sabit UUID */
function custId(i: number) {
  return `e5555555-f555-4555-a555-${String(i).padStart(12, "0")}`
}

const DYN_FIELD = "dfdfdfdf-aaaa-4aaa-baaa-000000001111"
const PS1 = "dddddddd-1111-4111-8111-111111111101"
const PS2 = "dddddddd-1111-4111-8111-111111111102"
const PS3 = "dddddddd-1111-4111-8111-111111111103"
const CF1 = "cfcfcfcf-1111-4111-8111-111111111101"
const CF2 = "cfcfcfcf-1111-4111-8111-111111111102"
const TA1 = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaa0001"

function ensureCompany(cid: string) {
  if (cid !== DEMO_COMPANY_UUID) {
    throw new Error("Bu işlem yalnızca demo şirket kimliği ile kullanılabilir.")
  }
}

export async function clearDemoSeedData(admin: SupabaseClient, companyId: string) {
  ensureCompany(companyId)

  await admin.from("payments").delete().eq("company_id", companyId)
  await admin.from("appointments").delete().eq("company_id", companyId)
  await admin.from("employee_leaves").delete().eq("company_id", companyId)
  await admin.from("commission_rules").delete().eq("company_id", companyId)
  await admin.from("campaigns").delete().eq("company_id", companyId)
  await admin.from("target_audiences").delete().eq("company_id", companyId)
  await admin.from("sms_packages").delete().eq("company_id", companyId)

  await admin.from("package_services").delete().in("package_id", [PKG.p1, PKG.p2])
  await admin.from("packages").delete().eq("company_id", companyId)

  const { data: flds } = await admin.from("dynamic_fields").select("id").eq("company_id", companyId)
  const fids = (flds ?? []).map((r) => r.id)
  if (fids.length) await admin.from("customer_field_values").delete().in("field_id", fids)
  await admin.from("dynamic_fields").delete().eq("company_id", companyId)

  await admin.from("customers").delete().eq("company_id", companyId)
  await admin.from("services").delete().eq("company_id", companyId)
  await admin.from("employees").delete().eq("company_id", companyId)
  await admin.from("service_locations").delete().eq("company_id", companyId)
}

/** Takvim UI ile aynı değerler (randevular/takvim) */
type ApptStatusTr = "onaylandi" | "beklemede" | "tamamlandi" | "iptal"

function priceForSvc(svc: keyof typeof SVC): { price: number; discount: number } {
  switch (svc) {
    case "s1":
      return { price: 1200, discount: 0 }
    case "s2":
      return { price: 900, discount: 50 }
    case "s3":
      return { price: 2500, discount: 120 }
    case "s4":
      return { price: 750, discount: 0 }
    case "s5":
      return { price: 500, discount: 0 }
    default:
      return { price: 500, discount: 0 }
  }
}

/** ~%40 onaylı, ~%18 beklemede, ~%18 iptal, ~%24 tamamlandı — dönüşümlü */
function buildStatusSequence(n: number): ApptStatusTr[] {
  const cycle: ApptStatusTr[] = [
    "onaylandi",
    "onaylandi",
    "beklemede",
    "iptal",
    "tamamlandi",
    "onaylandi",
    "beklemede",
    "onaylandi",
    "iptal",
    "tamamlandi",
    "beklemede",
    "onaylandi",
  ]
  return Array.from({ length: n }, (_, i) => cycle[i % cycle.length])
}

const EMP_KEYS = ["e1", "e2", "e3", "e4"] as const

/** Günde tam 10 randevu: 09:00–ca. 19:00; bazı saatler çakışır (farklı personel/stüdyo). */
const DAILY_SESSION_PATTERNS: {
  start: string
  end: string
  empKey: (typeof EMP_KEYS)[number]
  svc: keyof typeof SVC
}[] = [
  { start: "09:00", end: "09:45", empKey: "e1", svc: "s1" },
  { start: "09:35", end: "10:15", empKey: "e2", svc: "s2" },
  { start: "10:00", end: "10:50", empKey: "e3", svc: "s3" },
  { start: "10:00", end: "10:40", empKey: "e4", svc: "s4" },
  { start: "11:10", end: "11:55", empKey: "e1", svc: "s5" },
  { start: "12:45", end: "13:35", empKey: "e2", svc: "s1" },
  { start: "14:00", end: "14:50", empKey: "e3", svc: "s2" },
  { start: "14:25", end: "15:10", empKey: "e4", svc: "s3" },
  { start: "16:00", end: "16:50", empKey: "e1", svc: "s4" },
  { start: "18:00", end: "18:48", empKey: "e2", svc: "s5" },
]

function paidAtFromAppt(appointment_date: string, start_time: string | null | undefined): string {
  const raw = (start_time && String(start_time).trim()) || "12:00:00"
  const t = raw.length === 5 ? `${raw}:00` : raw
  return parseISO(`${appointment_date}T${t}`).toISOString()
}

function paidAtOnCalendarDay(day: Date, hour: number, minute: number): string {
  return setMinutes(setHours(startOfDay(day), hour), minute).toISOString()
}

export async function seedDemoSampleData(admin: SupabaseClient, companyId: string) {
  ensureCompany(companyId)
  await clearDemoSeedData(admin, companyId)

  await admin.from("companies").upsert({
    id: companyId,
    name: "Demo Şirket (Test Verisi)",
    phone: "05001112233",
    currency: "TRY",
  })

  await admin.from("service_locations").insert([
    { id: LOC.a, company_id: companyId, name: "(DEMO) Studio A", description: "Test salon bir" },
    { id: LOC.b, company_id: companyId, name: "(DEMO) Studio B", description: "Test salon iki" },
  ])

  await admin.from("employees").insert([
    { id: EMP.e1, company_id: companyId, full_name: "(DEMO) Ayşe Kaya", phone: "05009001001", email: `demo-emp1${EMAIL_MARK}`, color: "#2563eb", status: "active" },
    { id: EMP.e2, company_id: companyId, full_name: "(DEMO) Mehmet Yılmaz", phone: "05009001002", email: `demo-emp2${EMAIL_MARK}`, color: "#16a34a", status: "active" },
    { id: EMP.e3, company_id: companyId, full_name: "(DEMO) Zeynep Demir", phone: "05009001003", email: `demo-emp3${EMAIL_MARK}`, color: "#dc2626", status: "active" },
    { id: EMP.e4, company_id: companyId, full_name: "(DEMO) Can Arslan", phone: "05009001004", email: `demo-emp4${EMAIL_MARK}`, color: "#9333ea", status: "active" },
  ])

  await admin.from("services").insert([
    { id: SVC.s1, company_id: companyId, name: "(DEMO) Masaj 45dk", duration_hours: 0, duration_minutes: 45, price: 1200, vat_rate: 20, employee_id: EMP.e1, location_id: LOC.a },
    { id: SVC.s2, company_id: companyId, name: "(DEMO) Pilate 55dk", duration_hours: 0, duration_minutes: 55, price: 900, vat_rate: 20, employee_id: EMP.e2, location_id: LOC.a },
    { id: SVC.s3, company_id: companyId, name: "(DEMO) Cilt bakımı 60dk", duration_hours: 1, duration_minutes: 0, price: 2500, vat_rate: 20, employee_id: EMP.e3, location_id: LOC.b },
    { id: SVC.s4, company_id: companyId, name: "(DEMO) Saç kesim 40dk", duration_hours: 0, duration_minutes: 40, price: 750, vat_rate: 20, employee_id: EMP.e4, location_id: LOC.b },
    { id: SVC.s5, company_id: companyId, name: "(DEMO) Danışmanlık 30dk", duration_hours: 0, duration_minutes: 30, price: 500, vat_rate: 10, employee_id: EMP.e1, location_id: LOC.a },
  ])

  await admin.from("packages").insert([
    { id: PKG.p1, company_id: companyId, name: "(DEMO) 8 Seans Paket", description: "Test paketi A", usage_period: "none", price: 8000 },
    { id: PKG.p2, company_id: companyId, name: "(DEMO) Karışık Paket", description: "Test paketi B", usage_period: "none", price: 4500 },
  ])

  await admin.from("package_services").insert([
    { id: PS1, package_id: PKG.p1, service_id: SVC.s1, sessions: 8, price: 8000 },
    { id: PS2, package_id: PKG.p2, service_id: SVC.s2, sessions: 4, price: 2000 },
    { id: PS3, package_id: PKG.p2, service_id: SVC.s3, sessions: 2, price: 2500 },
  ])

  await admin.from("customers").insert(
    Array.from({ length: 12 }, (_, i) => ({
      id: custId(i + 1),
      company_id: companyId,
      full_name: `(DEMO) Müşteri ${i + 1}`,
      phone: `0500999${String(100 + i)}`,
      email: `demo-musteri-${i + 1}${EMAIL_MARK}`,
      gender: i % 2 === 0 ? "Kadın" : "Erkek",
      city: i % 3 === 0 ? "İstanbul" : i % 3 === 1 ? "Ankara" : "İzmir",
    }))
  )

  await admin.from("dynamic_fields").insert({
    id: DYN_FIELD,
    company_id: companyId,
    label: "(DEMO) Dahili not",
    field_type: "text",
  })

  await admin.from("customer_field_values").insert([
    { id: CF1, customer_id: custId(1), field_id: DYN_FIELD, value: "Örnek not: alerji yok." },
    { id: CF2, customer_id: custId(5), field_id: DYN_FIELD, value: "(DEMO) VIP" },
  ])

  type InsAppt = {
    company_id: string
    customer_id: string
    service_id: string
    employee_id: string
    location_id: string | null
    appointment_date: string
    start_time: string
    end_time: string
    status: string
    price: number
    discount: number
    notes: string | null
  }

  const today0 = startOfDay(new Date())
  const demoRangeStart = addDays(today0, -7)
  const demoRangeEnd = addDays(today0, 10)
  const calendarDays = eachDayOfInterval({
    start: demoRangeStart,
    end: demoRangeEnd,
  })
  const statusSeq = buildStatusSequence(DEMO_SEED_APPOINTMENT_BUDGET)
  const toInsert: InsAppt[] = []
  let seqI = 0

  dayLoop: for (let dayIndex = 0; dayIndex < calendarDays.length; dayIndex++) {
    const day = calendarDays[dayIndex]!
    const ds = format(day, "yyyy-MM-dd")

    for (let si = 0; si < DAILY_SESSION_PATTERNS.length; si++) {
      if (seqI >= DEMO_SEED_APPOINTMENT_BUDGET) break dayLoop

      const pat = DAILY_SESSION_PATTERNS[si]!
      const svc = pat.svc
      const custN = ((dayIndex * 5 + si * 2) % 12) + 1
      const empKey = pat.empKey
      const loc: keyof typeof LOC = empKey === "e3" || empKey === "e4" ? "b" : "a"
      const { price, discount } = priceForSvc(svc)
      const st = statusSeq[seqI]!

      seqI += 1
      toInsert.push({
        company_id: companyId,
        customer_id: custId(custN),
        service_id: SVC[svc],
        employee_id: EMP[empKey],
        location_id: LOC[loc],
        appointment_date: ds,
        start_time: `${pat.start}:00`,
        end_time: `${pat.end}:00`,
        status: st,
        price,
        discount,
        notes: `[DEMO] ${pat.start}–${pat.end} ${st}`,
      })
    }
  }

  const apptRows = toInsert.slice(0, DEMO_SEED_APPOINTMENT_BUDGET)

  const { data: insAppts, error: apErr } = await admin
    .from("appointments")
    .insert(apptRows)
    .select("id, customer_id, start_time, appointment_date, discount, price, status")
  if (apErr) throw apErr

  const payRows = (insAppts ?? []).filter(
    (a) => a.status === "onaylandi" || a.status === "tamamlandi"
  ).filter((_, i) => i % 2 === 0)

  if (payRows.length) {
    await admin.from("payments").insert(
      payRows.map((a, idx) => {
        const amt = Math.max(0, Number(a.price) - Number(a.discount ?? 0))
        const method = ["cash", "card", "transfer"][idx % 3]
        return {
          company_id: companyId,
          customer_id: a.customer_id,
          appointment_id: a.id,
          amount: amt,
          method,
          paid_at: paidAtFromAppt(String(a.appointment_date), a.start_time as string | null),
          notes: `[DEMO] Tahsilat ${method}`,
        }
      })
    )
  }

  const DEMO_PKG_SALES_COUNT = 12
  const PKG_TITLE_P1 = "(DEMO) 8 Seans Paket"
  const PKG_TITLE_P2 = "(DEMO) Karışık Paket"

  const pkgSpecs: {
    dayOffset: number
    hour: number
    minute: number
    amount: number
    custIndex: number
    method: string
    packageTitle: string
  }[] = [
    { dayOffset: -7, hour: 9, minute: 15, amount: 8000, custIndex: 1, method: "card", packageTitle: PKG_TITLE_P1 },
    { dayOffset: -6, hour: 10, minute: 40, amount: 4500, custIndex: 2, method: "cash", packageTitle: PKG_TITLE_P2 },
    { dayOffset: -5, hour: 11, minute: 25, amount: 8000, custIndex: 3, method: "transfer", packageTitle: PKG_TITLE_P1 },
    { dayOffset: -4, hour: 13, minute: 10, amount: 4500, custIndex: 4, method: "card", packageTitle: PKG_TITLE_P2 },
    { dayOffset: -3, hour: 14, minute: 35, amount: 8000, custIndex: 5, method: "cash", packageTitle: PKG_TITLE_P1 },
    { dayOffset: -2, hour: 15, minute: 50, amount: 4500, custIndex: 6, method: "card", packageTitle: PKG_TITLE_P2 },
    { dayOffset: -1, hour: 16, minute: 20, amount: 8000, custIndex: 7, method: "transfer", packageTitle: PKG_TITLE_P1 },
    { dayOffset: 0, hour: 17, minute: 5, amount: 4500, custIndex: 8, method: "cash", packageTitle: PKG_TITLE_P2 },
    { dayOffset: 1, hour: 10, minute: 0, amount: 8000, custIndex: 9, method: "card", packageTitle: PKG_TITLE_P1 },
    { dayOffset: 2, hour: 12, minute: 30, amount: 4500, custIndex: 10, method: "transfer", packageTitle: PKG_TITLE_P2 },
    { dayOffset: 4, hour: 14, minute: 15, amount: 8000, custIndex: 11, method: "cash", packageTitle: PKG_TITLE_P1 },
    { dayOffset: 6, hour: 18, minute: 30, amount: 4500, custIndex: 12, method: "card", packageTitle: PKG_TITLE_P2 },
  ]

  await admin.from("payments").insert(
    pkgSpecs.map((p) => ({
      company_id: companyId,
      customer_id: custId(p.custIndex),
      appointment_id: null,
      amount: p.amount,
      method: p.method,
      paid_at: paidAtOnCalendarDay(addDays(today0, p.dayOffset), p.hour, p.minute),
      notes: `[DEMO] Paket satışı — ${p.packageTitle}`,
    }))
  )

  await admin.from("commission_rules").insert([
    {
      company_id: companyId,
      name: "(DEMO) Ayşe — masaj %12",
      employee_id: EMP.e1,
      service_id: SVC.s1,
      scope: "service",
      rate: 12,
      is_active: true,
    },
    {
      company_id: companyId,
      name: "(DEMO) Mehmet — pilate %14",
      employee_id: EMP.e2,
      service_id: SVC.s2,
      scope: "service",
      rate: 14,
      is_active: true,
    },
    {
      company_id: companyId,
      name: "(DEMO) Zeynep — cilt %10",
      employee_id: EMP.e3,
      service_id: SVC.s3,
      scope: "service",
      rate: 10,
      is_active: true,
    },
    {
      company_id: companyId,
      name: "(DEMO) Can — saç kesim %10",
      employee_id: EMP.e4,
      service_id: SVC.s4,
      scope: "service",
      rate: 10,
      is_active: true,
    },
    {
      company_id: companyId,
      name: "(DEMO) Ayşe — danışmanlık %20",
      employee_id: EMP.e1,
      service_id: SVC.s5,
      scope: "service",
      rate: 20,
      is_active: true,
    },
  ])

  await admin.from("sms_packages").insert({
    company_id: companyId,
    name: "(DEMO) 500 SMS paketi",
    total_sms: 500,
    used_sms: 72,
  })

  await admin.from("target_audiences").insert({
    id: TA1,
    company_id: companyId,
    name: "(DEMO) Tüm aktif müşteri",
    filters: {},
  })

  await admin.from("campaigns").insert({
    company_id: companyId,
    target_audience_id: TA1,
    title: "(DEMO) Bahar kampanyası",
    status: "draft",
    sms_content: "(DEMO) Merhaba, randevunuzu hatırlatırız.",
    whatsapp_content: "(DEMO) Selam 👋",
    start_date: format(addDays(new Date(), -5), "yyyy-MM-dd"),
    end_date: format(addDays(new Date(), 12), "yyyy-MM-dd"),
  })

  await admin.from("employee_leaves").insert({
    company_id: companyId,
    employee_id: EMP.e2,
    start_date: format(addDays(new Date(), 4), "yyyy-MM-dd"),
    end_date: format(addDays(new Date(), 4), "yyyy-MM-dd"),
    reason: "(DEMO) Yıllık izin",
  })

  return {
    appointments: insAppts?.length ?? apptRows.length,
    payments: payRows.length + DEMO_PKG_SALES_COUNT,
    customers: 12,
    employees: 4,
    services: 5,
    packages: 2,
  }
}
