import type { SupabaseClient } from "@supabase/supabase-js"
import {
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  format,
  isAfter,
  parseISO,
  startOfDay,
  startOfMonth,
  subDays,
} from "date-fns"
import { tr } from "date-fns/locale"

import { expenseCategoryLabel, incomeCategoryLabel } from "@/lib/finance/category-labels"
import { ledgerLabel } from "@/lib/finance/payment-method-map"
import type {
  FinanceAccountKind,
  FinanceAccountRow,
  FinancePaymentMethod,
  FinanceRangeSummary,
  FinanceSettlementFlow,
  FinanceSummary,
  FinanceTransactionRow,
  FinanceTransactionType,
  OutstandingAppointmentRow,
  OutstandingPackageRow,
} from "@/types/finance"

function relOne<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null
  return Array.isArray(x) ? (x[0] ?? null) : x
}

export type RecordTransactionInput = {
  companyId: string
  type: FinanceTransactionType
  category: string
  amount: number
  description?: string | null
  referenceId?: string | null
  paymentMethod?: FinancePaymentMethod
  financeAccountId?: string | null
  settlementFlow?: FinanceSettlementFlow
}

function emptyBucket() {
  return { income: 0, expense: 0 }
}

function aggregateRows(
  rows: Pick<FinanceTransactionRow, "type" | "amount">[] | null
): { income: number; expense: number } {
  const out = emptyBucket()
  if (!rows?.length) return out
  for (const r of rows) {
    const n = Number(r.amount)
    if (r.type === "income") out.income += n
    else out.expense += n
  }
  return out
}

export async function resolveDefaultFinanceAccountByMethod(
  client: SupabaseClient,
  companyId: string,
  method: FinancePaymentMethod
): Promise<string | null> {
  const { data } = await client
    .from("finance_accounts")
    .select("id")
    .eq("company_id", companyId)
    .eq("maps_payment_method", method)
    .eq("is_active", true)
    .maybeSingle()
  return data?.id ?? null
}

export async function resolveFinanceAccountByKind(
  client: SupabaseClient,
  companyId: string,
  kind: FinanceAccountKind
): Promise<string | null> {
  const { data } = await client
    .from("finance_accounts")
    .select("id")
    .eq("company_id", companyId)
    .eq("kind", kind)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle()
  return data?.id ?? null
}

const DEFAULT_ACCOUNTS: Pick<
  FinanceAccountRow,
  "name" | "kind" | "maps_payment_method"
>[] = [
  { name: "Nakit kasa (fiziki)", kind: "cash_register", maps_payment_method: "cash" },
  { name: "POS / Klinik kart", kind: "pos_clearing", maps_payment_method: "pos" },
  {
    name: "Banka & online tahsilat (rezervasyon / EFT)",
    kind: "online_gateway",
    maps_payment_method: "online",
  },
  { name: "Müşteri alacakları", kind: "receivable", maps_payment_method: null },
  { name: "Tenzile (küçük harcama)", kind: "petty_cash", maps_payment_method: null },
]

export async function ensureDefaultFinanceAccounts(
  client: SupabaseClient,
  companyId: string
): Promise<{ error: Error | null }> {
  const { count, error: cErr } = await client
    .from("finance_accounts")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
  if (cErr) return { error: new Error(cErr.message) }

  if ((count ?? 0) === 0) {
    const { error } = await client.from("finance_accounts").insert(
      DEFAULT_ACCOUNTS.map((r) => ({
        company_id: companyId,
        name: r.name,
        kind: r.kind,
        maps_payment_method: r.maps_payment_method,
        is_active: true,
      }))
    )
    if (error) return { error: new Error(error.message) }
  } else {
    const { count: pettyN, error: pErr } = await client
      .from("finance_accounts")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("kind", "petty_cash")
    if (pErr) return { error: new Error(pErr.message) }
    if ((pettyN ?? 0) === 0) {
      const { error } = await client.from("finance_accounts").insert({
        company_id: companyId,
        name: "Tenzile (küçük harcama)",
        kind: "petty_cash",
        maps_payment_method: null,
        is_active: true,
      })
      if (error) return { error: new Error(error.message) }
    }
  }

  return { error: null }
}

export async function listFinanceAccounts(
  client: SupabaseClient,
  companyId: string
): Promise<{ data: FinanceAccountRow[] | null; error: Error | null }> {
  const { data, error } = await client
    .from("finance_accounts")
    .select("id, company_id, name, kind, maps_payment_method, is_active, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true })
  if (error) return { data: null, error: new Error(error.message) }
  return { data: data as FinanceAccountRow[] | null, error: null }
}

export async function createFinanceAccount(
  client: SupabaseClient,
  input: {
    companyId: string
    name: string
    kind: FinanceAccountKind
    mapsPaymentMethod?: FinancePaymentMethod | null
  }
): Promise<{ error: Error | null }> {
  if (input.mapsPaymentMethod) {
    await client
      .from("finance_accounts")
      .update({ maps_payment_method: null })
      .eq("company_id", input.companyId)
      .eq("maps_payment_method", input.mapsPaymentMethod)
  }
  const { error } = await client.from("finance_accounts").insert({
    company_id: input.companyId,
    name: input.name.trim(),
    kind: input.kind,
    maps_payment_method: input.mapsPaymentMethod ?? null,
    is_active: true,
  })
  return { error: error ? new Error(error.message) : null }
}

export async function deactivateFinanceAccount(
  client: SupabaseClient,
  companyId: string,
  accountId: string
): Promise<{ error: Error | null }> {
  const { error } = await client
    .from("finance_accounts")
    .update({ is_active: false, maps_payment_method: null })
    .eq("id", accountId)
    .eq("company_id", companyId)
  return { error: error ? new Error(error.message) : null }
}

export async function setFinanceAccountPaymentMapping(
  client: SupabaseClient,
  companyId: string,
  accountId: string,
  mapsPaymentMethod: FinancePaymentMethod | null
): Promise<{ error: Error | null }> {
  if (mapsPaymentMethod) {
    await client
      .from("finance_accounts")
      .update({ maps_payment_method: null })
      .eq("company_id", companyId)
      .eq("maps_payment_method", mapsPaymentMethod)
  }
  const { error } = await client
    .from("finance_accounts")
    .update({ maps_payment_method: mapsPaymentMethod })
    .eq("id", accountId)
    .eq("company_id", companyId)
  return { error: error ? new Error(error.message) : null }
}

export function formatTransactionsAsCsv(
  rows: FinanceTransactionRow[],
  separator: string = ";"
): string {
  const headers = [
    "created_at",
    "type",
    "category",
    "amount",
    "payment_method",
    "account",
    "settlement_flow",
    "description",
    "reference_id",
  ]
  const escape = (v: string) => {
    const s = v.replace(/"/g, '""')
    return `"${s}"`
  }
  const lines = [headers.join(separator)]
  for (const t of rows) {
    const acc = t.finance_accounts?.name ?? ""
    const line = [
      t.created_at,
      t.type,
      t.category,
      String(t.amount),
      t.payment_method,
      acc,
      t.settlement_flow ?? "settled",
      t.description ?? "",
      t.reference_id ?? "",
    ].map((x) => escape(String(x)))
    lines.push(line.join(separator))
  }
  return lines.join("\r\n")
}

const SETTLEMENT_LABELS_TR: Record<FinanceSettlementFlow, string> = {
  settled: "Tahsil",
  receivable: "Alacak",
  installment: "Taksit / plan",
}

/** CSV for Excel (TR): human-readable column titles and TR labels. Separator `;`, UTF-8 BOM via downloadTextFile. */
export function formatTransactionsAsCsvTurkish(
  rows: FinanceTransactionRow[],
  separator: string = ";"
): string {
  const headers = [
    "Tarih (yerel)",
    "Tür",
    "Kategori",
    "Tutar",
    "Ödeme şekli",
    "Hesap (Kasa & banka)",
    "Mutabakat",
    "Açıklama",
    "Referans ID",
  ]
  const escape = (v: string) => {
    const s = v.replace(/"/g, '""')
    return `"${s}"`
  }
  const lines = [headers.join(separator)]
  for (const t of rows) {
    const when = (() => {
      try {
        return format(parseISO(t.created_at), "dd.MM.yyyy HH:mm", { locale: tr })
      } catch {
        return t.created_at
      }
    })()
    const typeTr = t.type === "income" ? "Gelir" : "Gider"
    const cat =
      t.type === "income" ? incomeCategoryLabel(t.category) : expenseCategoryLabel(t.category)
    const acc = t.finance_accounts?.name ?? ""
    const flow = (t.settlement_flow ?? "settled") as FinanceSettlementFlow
    const flowTr = SETTLEMENT_LABELS_TR[flow] ?? flow
    const line = [
      when,
      typeTr,
      cat,
      String(t.amount),
      ledgerLabel(t.payment_method),
      acc,
      flowTr,
      t.description ?? "",
      t.reference_id ?? "",
    ].map((x) => escape(String(x)))
    lines.push(line.join(separator))
  }
  return lines.join("\r\n")
}

export function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob(["\ufeff" + content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function recordTransaction(
  client: SupabaseClient,
  input: RecordTransactionInput
): Promise<{ error: Error | null }> {
  const paymentMethod: FinancePaymentMethod = input.paymentMethod ?? "cash"
  const settlementFlow: FinanceSettlementFlow = input.settlementFlow ?? "settled"
  const row: Record<string, unknown> = {
    company_id: input.companyId,
    type: input.type,
    category: input.category,
    amount: input.amount,
    description: input.description ?? null,
    reference_id: input.referenceId ?? null,
    payment_method: paymentMethod,
    finance_account_id: input.financeAccountId ?? null,
    settlement_flow: settlementFlow,
  }
  const { error } = await client.from("finance_transactions").insert(row)
  return { error: error ? new Error(error.message) : null }
}

export async function getFinancialSummary(
  client: SupabaseClient,
  companyId: string,
  now: Date = new Date()
): Promise<{ data: FinanceSummary | null; error: Error | null }> {
  const dayStart = startOfDay(now).toISOString()
  const monthStart = startOfMonth(now).toISOString()
  const monthEnd = endOfMonth(now).toISOString()

  const [todayRes, monthRes, allRes] = await Promise.all([
    client
      .from("finance_transactions")
      .select("type, amount")
      .eq("company_id", companyId)
      .gte("created_at", dayStart),
    client
      .from("finance_transactions")
      .select("type, amount")
      .eq("company_id", companyId)
      .gte("created_at", monthStart)
      .lte("created_at", monthEnd),
    client.from("finance_transactions").select("type, amount").eq("company_id", companyId),
  ])

  const err =
    todayRes.error?.message ||
    monthRes.error?.message ||
    allRes.error?.message ||
    null
  if (err) {
    return { data: null, error: new Error(err) }
  }

  return {
    data: {
      today: aggregateRows(todayRes.data as FinanceTransactionRow[] | null),
      thisMonth: aggregateRows(monthRes.data as FinanceTransactionRow[] | null),
      allTime: aggregateRows(allRes.data as FinanceTransactionRow[] | null),
    },
    error: null,
  }
}

export async function getFinancialSummaryForRange(
  client: SupabaseClient,
  companyId: string,
  from: Date,
  to: Date
): Promise<{ data: FinanceRangeSummary | null; error: Error | null }> {
  let start = startOfDay(from)
  let end = endOfDay(to)
  if (isAfter(start, end)) {
    const a = start
    start = startOfDay(to)
    end = endOfDay(a)
  }

  const { data, error } = await client
    .from("finance_transactions")
    .select("type, amount")
    .eq("company_id", companyId)
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString())

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  const agg = aggregateRows(data as Pick<FinanceTransactionRow, "type" | "amount">[] | null)
  return {
    data: {
      income: agg.income,
      expense: agg.expense,
      net: agg.income - agg.expense,
    },
    error: null,
  }
}

export type TransactionsListOptions = {
  type?: FinanceTransactionType
  limit?: number
  from?: Date
  to?: Date
}

const TX_SELECT =
  "id, company_id, created_at, type, category, amount, description, reference_id, payment_method, finance_account_id, settlement_flow, finance_accounts(name, kind)"

export async function getTransactionsList(
  client: SupabaseClient,
  companyId: string,
  options?: TransactionsListOptions
): Promise<{ data: FinanceTransactionRow[] | null; error: Error | null }> {
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 500)
  let rangeStart: Date | undefined
  let rangeEnd: Date | undefined
  if (options?.from && options?.to) {
    const a = startOfDay(options.from)
    const b = endOfDay(options.to)
    if (isAfter(a, b)) {
      rangeStart = startOfDay(options.to)
      rangeEnd = endOfDay(options.from)
    } else {
      rangeStart = a
      rangeEnd = b
    }
  } else {
    if (options?.from) rangeStart = startOfDay(options.from)
    if (options?.to) rangeEnd = endOfDay(options.to)
  }

  let q = client
    .from("finance_transactions")
    .select(TX_SELECT)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (rangeStart) {
    q = q.gte("created_at", rangeStart.toISOString())
  }
  if (rangeEnd) {
    q = q.lte("created_at", rangeEnd.toISOString())
  }

  if (options?.type) {
    q = q.eq("type", options.type)
  }

  const { data, error } = await q
  if (error) {
    return { data: null, error: new Error(error.message) }
  }
  const normalized: FinanceTransactionRow[] = ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const fa = relOne(row.finance_accounts as { name: string; kind: FinanceAccountKind } | null | { name: string; kind: FinanceAccountKind }[])
    return {
      ...row,
      settlement_flow: (row.settlement_flow as FinanceSettlementFlow) ?? "settled",
      finance_accounts: fa,
    } as FinanceTransactionRow
  })
  return { data: normalized, error: null }
}

export async function getWalletBalances(
  client: SupabaseClient,
  companyId: string
): Promise<{
  data: Array<{ id: string; name: string; kind: FinanceAccountKind; current_balance: number }> | null
  error: Error | null
}> {
  const { data: accountsRaw, error } = await listFinanceAccounts(client, companyId)
  if (error || !accountsRaw) {
    return { data: null, error: error ?? new Error("Hesaplar yüklenemedi") }
  }
  const accounts = accountsRaw.filter((a) => a.is_active)
  const { data: txs, error: txErr } = await client
    .from("finance_transactions")
    .select("type, amount, finance_account_id")
    .eq("company_id", companyId)
  if (txErr) {
    return { data: null, error: new Error(txErr.message) }
  }
  const incoming = new Map<string, number>()
  const outgoing = new Map<string, number>()
  for (const t of txs ?? []) {
    const id = (t as { finance_account_id: string | null }).finance_account_id
    if (!id) continue
    const amt = Number((t as { amount: number }).amount) || 0
    const type = (t as { type: string }).type
    if (type === "income") {
      incoming.set(id, (incoming.get(id) ?? 0) + amt)
    } else if (type === "expense") {
      outgoing.set(id, (outgoing.get(id) ?? 0) + amt)
    }
  }
  const { data: iRows, error: iErr } = await client
    .from("finance_internal_transfers")
    .select("from_account_id, to_account_id, amount")
    .eq("company_id", companyId)
  const outI = new Map<string, number>()
  const inI = new Map<string, number>()
  if (iErr) {
    // finance_v2_refine.sql yoksa tablo eksik olabilir — virman olmadan bakiye hesapla
    console.warn("[finance] finance_internal_transfers:", iErr.message)
  } else {
    for (const r of iRows ?? []) {
    const a = r as { from_account_id: string; to_account_id: string; amount: number }
    const amt = Number(a.amount) || 0
    outI.set(a.from_account_id, (outI.get(a.from_account_id) ?? 0) + amt)
    inI.set(a.to_account_id, (inI.get(a.to_account_id) ?? 0) + amt)
  }
  }
  const data = accounts.map((a) => {
    const inc = incoming.get(a.id) ?? 0
    const exp = outgoing.get(a.id) ?? 0
    const outInternal = outI.get(a.id) ?? 0
    const inInternal = inI.get(a.id) ?? 0
    return {
      id: a.id,
      name: a.name,
      kind: a.kind,
      current_balance: inc - exp - outInternal + inInternal,
    }
  })
  return { data, error: null }
}

/** Dönem içi hesap bazlı net (gelir − gider − çıkan virman + giren virman); created_at tarih aralığına göre */
export async function getWalletBalancesForRange(
  client: SupabaseClient,
  companyId: string,
  from: Date,
  to: Date
): Promise<{
  data: Array<{ id: string; name: string; kind: FinanceAccountKind; current_balance: number }> | null
  error: Error | null
}> {
  let start = startOfDay(from)
  let end = endOfDay(to)
  if (isAfter(start, end)) {
    start = startOfDay(to)
    end = endOfDay(from)
  }

  const { data: accountsRaw, error } = await listFinanceAccounts(client, companyId)
  if (error || !accountsRaw) {
    return { data: null, error: error ?? new Error("Hesaplar yüklenemedi") }
  }
  const accounts = accountsRaw.filter((a) => a.is_active)

  const startIso = start.toISOString()
  const endIso = end.toISOString()

  const { data: txs, error: txErr } = await client
    .from("finance_transactions")
    .select("type, amount, finance_account_id")
    .eq("company_id", companyId)
    .gte("created_at", startIso)
    .lte("created_at", endIso)
  if (txErr) {
    return { data: null, error: new Error(txErr.message) }
  }

  const incoming = new Map<string, number>()
  const outgoing = new Map<string, number>()
  for (const t of txs ?? []) {
    const id = (t as { finance_account_id: string | null }).finance_account_id
    if (!id) continue
    const amt = Number((t as { amount: number }).amount) || 0
    const type = (t as { type: string }).type
    if (type === "income") {
      incoming.set(id, (incoming.get(id) ?? 0) + amt)
    } else if (type === "expense") {
      outgoing.set(id, (outgoing.get(id) ?? 0) + amt)
    }
  }

  const { data: iRows, error: iErr } = await client
    .from("finance_internal_transfers")
    .select("from_account_id, to_account_id, amount")
    .eq("company_id", companyId)
    .gte("created_at", startIso)
    .lte("created_at", endIso)

  const outI = new Map<string, number>()
  const inI = new Map<string, number>()
  if (iErr) {
    console.warn("[finance] finance_internal_transfers (range):", iErr.message)
  } else {
    for (const r of iRows ?? []) {
      const a = r as { from_account_id: string; to_account_id: string; amount: number }
      const amt = Number(a.amount) || 0
      outI.set(a.from_account_id, (outI.get(a.from_account_id) ?? 0) + amt)
      inI.set(a.to_account_id, (inI.get(a.to_account_id) ?? 0) + amt)
    }
  }

  const data = accounts.map((a) => {
    const inc = incoming.get(a.id) ?? 0
    const exp = outgoing.get(a.id) ?? 0
    const outInternal = outI.get(a.id) ?? 0
    const inInternal = inI.get(a.id) ?? 0
    return {
      id: a.id,
      name: a.name,
      kind: a.kind,
      current_balance: inc - exp - outInternal + inInternal,
    }
  })
  return { data, error: null }
}

export type OutstandingReceivablesPeriod = { from: Date; to: Date }

export async function getOutstandingReceivables(
  client: SupabaseClient,
  companyId: string,
  period?: OutstandingReceivablesPeriod
): Promise<{
  data: {
    appointments: OutstandingAppointmentRow[]
    packages: OutstandingPackageRow[]
    totalBalance: number
  } | null
  error: Error | null
}> {
  let fromIso: string | null = null
  let toIso: string | null = null
  if (period) {
    let start = startOfDay(period.from)
    let end = endOfDay(period.to)
    if (isAfter(start, end)) {
      start = startOfDay(period.to)
      end = endOfDay(period.from)
    }
    fromIso = format(start, "yyyy-MM-dd")
    toIso = format(end, "yyyy-MM-dd")
  }

  let appsQuery = client
    .from("appointments")
    .select("id, price, status, appointment_date, customers(full_name), services(name)")
    .eq("company_id", companyId)
    .not("price", "is", null)
  if (fromIso && toIso) {
    appsQuery = appsQuery.gte("appointment_date", fromIso).lte("appointment_date", toIso)
  }
  const { data: apps, error: e1 } = await appsQuery

  let pays: Array<{ appointment_id: string | null; amount: number | string }> = []
  let e2: Error | null = null
  if (!e1) {
    if (period && fromIso && toIso) {
      const ids = (apps ?? []).map((a) => a.id)
      if (ids.length > 0) {
        const pr = await client
          .from("payments")
          .select("appointment_id, amount")
          .eq("company_id", companyId)
          .in("appointment_id", ids)
        pays = (pr.data ?? []) as typeof pays
        if (pr.error) e2 = new Error(pr.error.message)
      }
    } else {
      const pr = await client.from("payments").select("appointment_id, amount").eq("company_id", companyId)
      pays = (pr.data ?? []) as typeof pays
      if (pr.error) e2 = new Error(pr.error.message)
    }
  }

  let pkgsQuery = client
    .from("customer_packages")
    .select("id, total_price, total_paid, status, start_date, end_date, customers(full_name), packages(name)")
    .eq("company_id", companyId)
  if (fromIso && toIso) {
    pkgsQuery = pkgsQuery.lte("start_date", toIso).or(`end_date.is.null,end_date.gte.${fromIso}`)
  }
  const { data: pkgs, error: e3 } = await pkgsQuery

  if (e1 || e2) {
    return {
      data: null,
      error: new Error(e1?.message || e2?.message || "Alacak sorgusu başarısız"),
    }
  }

  const paidByApp = new Map<string, number>()
  for (const p of pays) {
    if (!p.appointment_id) continue
    paidByApp.set(p.appointment_id, (paidByApp.get(p.appointment_id) || 0) + Number(p.amount))
  }

  const appointmentRows: OutstandingAppointmentRow[] = (apps || [])
    .filter((a) => a.status !== "cancelled")
    .map((a) => {
      const price = Number(a.price) || 0
      const paid = paidByApp.get(a.id) || 0
      const customers = relOne(a.customers as { full_name: string } | { full_name: string }[] | null)
      const services = relOne(a.services as { name: string } | { name: string }[] | null)
      return {
        id: a.id,
        appointment_date: (a.appointment_date as string | null) ?? null,
        customer_name: customers?.full_name || "—",
        service_name: services?.name || "—",
        status: String(a.status),
        price,
        paid,
        balance: Math.max(0, price - paid),
      }
    })
    .filter((r) => r.balance > 0.009)

  const packageRows: OutstandingPackageRow[] = (e3 ? [] : pkgs || [])
    .filter((row) => row.status !== "cancelled")
    .map((row) => {
      const total_price = Number(row.total_price) || 0
      const total_paid = Number(row.total_paid) || 0
      const customers = relOne(row.customers as { full_name: string } | { full_name: string }[] | null)
      const packages = relOne(row.packages as { name: string } | { name: string }[] | null)
      return {
        id: row.id,
        start_date: (row.start_date as string | null) ?? null,
        customer_name: customers?.full_name || "—",
        package_name: packages?.name || "—",
        status: String(row.status),
        total_price,
        total_paid,
        balance: Math.max(0, total_price - total_paid),
      }
    })
    .filter((r) => r.balance > 0.009)

  const totalBalance =
    appointmentRows.reduce((s, r) => s + r.balance, 0) +
    packageRows.reduce((s, r) => s + r.balance, 0)

  return {
    data: { appointments: appointmentRows, packages: packageRows, totalBalance },
    error: null,
  }
}

export async function recordInternalTransfer(
  client: SupabaseClient,
  companyId: string,
  fromAccountId: string,
  toAccountId: string,
  amount: number,
  memo?: string
): Promise<{ error: Error | null }> {
  if (fromAccountId === toAccountId) {
    return { error: new Error("Kaynak ve hedef hesap aynı olamaz") }
  }
  if (amount <= 0) {
    return { error: new Error("Geçerli bir tutar girin") }
  }
  const { error } = await client.from("finance_internal_transfers").insert({
    company_id: companyId,
    from_account_id: fromAccountId,
    to_account_id: toAccountId,
    amount,
    description: memo?.trim() || null,
  })
  if (error) {
    return { error: new Error(error.message) }
  }
  return { error: null }
}

export async function listRecentInternalTransfers(
  client: SupabaseClient,
  companyId: string,
  limit = 20
): Promise<{
  data: Array<{
    id: string
    amount: number
    description: string | null
    created_at: string
    from_account_id: string
    to_account_id: string
  }> | null
  error: Error | null
}> {
  const { data, error } = await client
    .from("finance_internal_transfers")
    .select("id, amount, description, created_at, from_account_id, to_account_id")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(Math.min(limit, 100))
  if (error) {
    return { data: null, error: new Error(error.message) }
  }
  return {
    data: (data ?? []) as Array<{
      id: string
      amount: number
      description: string | null
      created_at: string
      from_account_id: string
      to_account_id: string
    }>,
    error: null,
  }
}

export async function getCashFlowDailyLastDays(
  client: SupabaseClient,
  companyId: string,
  days = 7
): Promise<{
  data: Array<{ date: string; income: number; expense: number }> | null
  error: Error | null
}> {
  const end = endOfDay(new Date())
  const start = startOfDay(subDays(end, days - 1))
  const interval = eachDayOfInterval({ start, end })
  const { data: txs, error } = await client
    .from("finance_transactions")
    .select("created_at, type, amount")
    .eq("company_id", companyId)
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString())
  if (error) {
    return { data: null, error: new Error(error.message) }
  }
  const byDay = new Map<string, { income: number; expense: number }>()
  for (const d of interval) {
    byDay.set(format(d, "yyyy-MM-dd"), { income: 0, expense: 0 })
  }
  for (const t of txs ?? []) {
    const row = t as { created_at: string; type: string; amount: number }
    const key = format(parseISO(row.created_at), "yyyy-MM-dd")
    if (!byDay.has(key)) continue
    const cur = byDay.get(key)!
    const amt = Number(row.amount) || 0
    if (row.type === "income") cur.income += amt
    else if (row.type === "expense") cur.expense += amt
  }
  const data = interval.map((d) => {
    const key = format(d, "yyyy-MM-dd")
    const v = byDay.get(key)!
    return { date: key, income: v.income, expense: v.expense }
  })
  return { data, error: null }
}

/** Seçili başlangıç–bitiş (dahil) günleri için günlük gelir/gider özeti */
export async function getCashFlowDailyForRange(
  client: SupabaseClient,
  companyId: string,
  from: Date,
  to: Date
): Promise<{
  data: Array<{ date: string; income: number; expense: number }> | null
  error: Error | null
}> {
  let start = startOfDay(from)
  let end = endOfDay(to)
  if (isAfter(start, end)) {
    start = startOfDay(to)
    end = endOfDay(from)
  }
  const interval = eachDayOfInterval({ start, end })
  const { data: txs, error } = await client
    .from("finance_transactions")
    .select("created_at, type, amount")
    .eq("company_id", companyId)
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString())
  if (error) {
    return { data: null, error: new Error(error.message) }
  }
  const byDay = new Map<string, { income: number; expense: number }>()
  for (const d of interval) {
    byDay.set(format(d, "yyyy-MM-dd"), { income: 0, expense: 0 })
  }
  for (const t of txs ?? []) {
    const row = t as { created_at: string; type: string; amount: number }
    const key = format(parseISO(row.created_at), "yyyy-MM-dd")
    if (!byDay.has(key)) continue
    const cur = byDay.get(key)!
    const amt = Number(row.amount) || 0
    if (row.type === "income") cur.income += amt
    else if (row.type === "expense") cur.expense += amt
  }
  const data = interval.map((d) => {
    const key = format(d, "yyyy-MM-dd")
    const v = byDay.get(key)!
    return { date: key, income: v.income, expense: v.expense }
  })
  return { data, error: null }
}

export async function getTopExpenseCategoriesForRange(
  client: SupabaseClient,
  companyId: string,
  from: Date,
  to: Date,
  limit = 5
): Promise<{
  data: Array<{ category: string; total: number }> | null
  error: Error | null
}> {
  let start = startOfDay(from)
  let end = endOfDay(to)
  if (isAfter(start, end)) {
    start = startOfDay(to)
    end = endOfDay(from)
  }
  const { data, error } = await client
    .from("finance_transactions")
    .select("category, amount")
    .eq("company_id", companyId)
    .eq("type", "expense")
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString())
  if (error) {
    return { data: null, error: new Error(error.message) }
  }
  const agg = new Map<string, number>()
  for (const t of data ?? []) {
    const c = (t as { category: string | null }).category || "other"
    const amt = Number((t as { amount: number }).amount) || 0
    agg.set(c, (agg.get(c) ?? 0) + amt)
  }
  const sorted = Array.from(agg.entries()).sort((a, b) => b[1] - a[1])
  const dataOut = sorted.slice(0, limit).map(([category, total]) => ({ category, total }))
  return { data: dataOut, error: null }
}

export async function getTopExpenseCategoriesThisMonth(
  client: SupabaseClient,
  companyId: string,
  limit = 5
): Promise<{
  data: Array<{ category: string; total: number }> | null
  error: Error | null
}> {
  const now = new Date()
  return getTopExpenseCategoriesForRange(client, companyId, startOfMonth(now), endOfMonth(now), limit)
}
