"use client"

export const dynamic = "force-dynamic"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { format, parseISO } from "date-fns"
import { tr } from "date-fns/locale"
import {
  Search,
  Filter,
  Loader2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  History,
} from "lucide-react"
import { AppointmentOdemeSheet } from "@/components/odemeler/AppointmentOdemeSheet"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { supabaseData as supabase } from "@/lib/supabase-data"
import { useCompany } from "@/hooks/useCompany"
import { displayServiceName } from "@/hooks/useAsistanDashboard"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 10

type ApptRow = {
  id: string
  appointment_date: string
  start_time: string
  price: number | null
  discount: number | null
  services: { name: string | null } | null
  employees: { full_name: string | null } | null
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function mapPayMethodLabel(m: string | null | undefined) {
  const x = (m ?? "").toLowerCase()
  if (x === "kart" || x === "pos" || x === "card") return "Kredi Kartı"
  if (x === "online") return "Online Ödeme"
  if (x === "havale" || x === "transfer") return "Havale"
  if (x === "nakit" || x === "cash") return "Nakit"
  return m || "—"
}

function fmtMoney(n: number) {
  return `₺${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function apptDisplayDate(ad: string, st: string | null) {
  const tm = String(st ?? "12:00:00").trim()
  const tPart = tm.length <= 5 ? `${tm}:00` : tm
  try {
    return format(parseISO(`${ad}T${tPart}`), "dd.MM.yyyy HH:mm", { locale: tr })
  } catch {
    return `${ad}`
  }
}

export default function OdemelerMusteriDetayPage() {
  const params = useParams()
  const customerId = params.customerId as string
  const { companyId } = useCompany()

  const [loading, setLoading] = useState(true)
  const [customerName, setCustomerName] = useState("")
  const [totalSales, setTotalSales] = useState(0)
  const [totalPaid, setTotalPaid] = useState(0)
  const [rows, setRows] = useState<
    Array<{
      id: string
      dateLabel: string
      serviceLabel: string
      employeeLabel: string
      discountAmt: number
      linePaid: number
      balance: number
    }>
  >([])
  const [search, setSearch] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [odemeSheet, setOdemeSheet] = useState<{
    mode: "pay" | "history"
    appointmentId: string
    serviceLabel: string
    /** Tablodaki bu satır için ödenen toplam (API yüklenene kadar kalan hesabında kullanılır) */
    tableLinePaid: number
    /** Randevu satır net tutarı (ödenen + kalan); sheet içinde gerçek kalan hesaplanır */
    randevuNet: number
  } | null>(null)
  const [customerPayHistoryOpen, setCustomerPayHistoryOpen] = useState(false)
  /** Tüm müşteri ödemeleri (modal + toplamlar için) */
  const [paymentRecords, setPaymentRecords] = useState<
    Array<{
      id: string
      amount: number
      paid_at: string | null
      method: string | null
      created_at: string | null
    }>
  >([])

  const fetchData = useCallback(async () => {
    if (!companyId || !customerId) return
    setLoading(true)

    const { data: cust, error: eCust } = await supabase
      .from("customers")
      .select("id, full_name")
      .eq("id", customerId)
      .eq("company_id", companyId)
      .maybeSingle()

    if (eCust || !cust) {
      setCustomerName("")
      setRows([])
      setPaymentRecords([])
      setLoading(false)
      return
    }

    setCustomerName(cust.full_name ?? "")

    const [{ data: appts }, { data: pays }] = await Promise.all([
      supabase
        .from("appointments")
        .select(
          `id, appointment_date, start_time, price, discount, services ( name ), employees ( full_name )`
        )
        .eq("company_id", companyId)
        .eq("customer_id", customerId)
        .order("appointment_date", { ascending: false })
        .order("start_time", { ascending: false }),
      supabase
        .from("payments")
        .select("id, amount, appointment_id, notes, paid_at, method, created_at")
        .eq("company_id", companyId)
        .eq("customer_id", customerId),
    ])

    const paidMap = new Map<string, number>()
    let gross = 0
    let paidAll = 0

    ;(appts ?? []).forEach((a) => {
      const net =
        Math.max(
          0,
          Math.round(((Number(a.price) || 0) - (Number(a.discount) || 0)) * 100) / 100
        )
      gross += net
    })

    ;(pays ?? []).forEach((p) => {
      const amt = Math.round((Number(p.amount) || 0) * 100) / 100
      paidAll += amt
      if (!p.appointment_id && /Paket satışı/i.test(p.notes || "")) {
        gross += amt
      }
      const aid = p.appointment_id
      if (!aid || typeof aid !== "string") return
      paidMap.set(aid, (paidMap.get(aid) ?? 0) + amt)
    })

    setTotalPaid(Math.round(paidAll * 100) / 100)
    setTotalSales(Math.round(gross * 100) / 100)

    const list = ((appts ?? []) as unknown as ApptRow[]).map((a) => {
      const svcRaw =
        a.services?.name != null ? String(a.services.name) : ""
      const discountAmt = Number(a.discount) || 0
      const net0 = Math.max(0, (Number(a.price) || 0) - discountAmt)
      const clampedNet = Math.round(net0 * 100) / 100
      const linePaid = Math.round((paidMap.get(a.id) ?? 0) * 100) / 100
      const balance = Math.round((clampedNet - linePaid) * 100) / 100
      const empNm = a.employees?.full_name?.trim() ?? "—"

      return {
        id: a.id,
        dateLabel: apptDisplayDate(a.appointment_date, a.start_time),
        serviceLabel: displayServiceName(svcRaw || null),
        employeeLabel: empNm,
        discountAmt,
        linePaid,
        balance,
      }
    })

    setRows(list)
    setPaymentRecords(
      (pays ?? []).map((p) => ({
        id: String((p as { id: string }).id),
        amount: round2(Number((p as { amount: unknown }).amount) || 0),
        paid_at: (p as { paid_at?: string | null }).paid_at ?? null,
        method: (p as { method?: string | null }).method ?? null,
        created_at: (p as { created_at?: string | null }).created_at ?? null,
      }))
    )
    setLoading(false)
  }, [companyId, customerId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      return (
        r.dateLabel.toLowerCase().includes(q) ||
        r.serviceLabel.toLowerCase().includes(q) ||
        r.employeeLabel.toLowerCase().includes(q)
      )
    })
  }, [rows, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageSafe = Math.min(Math.max(1, page), totalPages)
  const offset = (pageSafe - 1) * PAGE_SIZE
  const slice = filtered.slice(offset, offset + PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [search, rows.length])

  const kalanToplam =
    Math.round((totalSales - totalPaid) * 100) / 100

  const customerPaymentHistoryRows = useMemo(() => {
    const totalOwed = round2(totalSales)
    const sorted = [...paymentRecords]
      .map((p) => ({
        ...p,
        ts: p.paid_at
          ? new Date(p.paid_at).getTime()
          : p.created_at
            ? new Date(p.created_at).getTime()
            : 0,
      }))
      .sort((a, b) => a.ts - b.ts)

    let cum = 0
    const out: Array<{
      id: string
      dateLabel: string
      methodLabel: string
      kalanAfter: number
    }> = []
    for (const p of sorted) {
      cum = round2(cum + p.amount)
      const kalanAfter = Math.max(0, round2(totalOwed - cum))
      const raw = p.paid_at ?? p.created_at
      const dateLabel = raw ? format(new Date(raw), "dd.MM.yyyy", { locale: tr }) : "—"
      out.push({
        id: p.id,
        dateLabel,
        methodLabel: mapPayMethodLabel(p.method),
        kalanAfter,
      })
    }
    return out.reverse()
  }, [paymentRecords, totalSales])

  return (
    <div className="w-full min-w-0 space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap gap-3">
          <div className="min-h-[88px] min-w-[140px] flex-1 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-xl font-bold tabular-nums text-slate-900">{fmtMoney(totalPaid)}</p>
            <p className="mt-1 text-xs text-slate-500">Yapılan Ödeme</p>
          </div>
          <div className="min-h-[88px] min-w-[140px] flex-1 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <p
              className={cn(
                "text-xl font-bold tabular-nums",
                kalanToplam > 0 ? "text-red-600" : "text-emerald-600"
              )}
            >
              {fmtMoney(kalanToplam)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Kalan Bakiye</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-11 w-11 shrink-0 self-end rounded-full sm:self-auto"
          title="Ödeme geçmişi"
          aria-label="Ödeme geçmişi"
          onClick={() => setCustomerPayHistoryOpen(true)}
        >
          <History className="h-5 w-5" aria-hidden />
        </Button>
      </div>

      <Dialog open={customerPayHistoryOpen} onOpenChange={setCustomerPayHistoryOpen}>
        <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-slate-200 px-5 py-4 text-left">
            <DialogTitle className="text-lg font-semibold text-slate-900">Ödemeler</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {customerName ? `${customerName} — tüm tahsilat kayıtları` : "Tahsilat kayıtları"}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4 sm:px-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : customerPaymentHistoryRows.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">Kayıtlı ödeme yok.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[400px] text-sm">
                  <thead>
                    <tr className="border-b bg-slate-100 text-left text-xs font-semibold text-slate-700">
                      <th className="py-2.5 px-3 whitespace-nowrap">Ödeme tarihi</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Ödeme şekli</th>
                      <th className="py-2.5 px-3 whitespace-nowrap text-right">Kalan bakiye</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerPaymentHistoryRows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-slate-100 last:border-0 odd:bg-white even:bg-slate-50/50"
                      >
                        <td className="py-2.5 px-3 tabular-nums text-slate-800">{row.dateLabel}</td>
                        <td className="py-2.5 px-3 text-slate-700">{row.methodLabel}</td>
                        <td
                          className={cn(
                            "py-2.5 px-3 text-right font-medium tabular-nums",
                            row.kalanAfter > 0 ? "text-amber-700" : "text-emerald-600"
                          )}
                        >
                          {fmtMoney(row.kalanAfter)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          aria-label="Filtre"
          onClick={() => setShowFilters((x) => !x)}
        >
          <Filter className="h-4 w-4" />
        </Button>
        <div className="relative min-w-[12rem] flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Ödeme Ara"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>
      {showFilters && (
        <p className="text-xs text-slate-500">
          Liste: randevu tarihi / hizmet / çalışan alanlarında arama.
        </p>
      )}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-semibold text-slate-600">
                <th className="py-3 px-4 whitespace-nowrap">Randevu tarihi</th>
                <th className="py-3 px-4 whitespace-nowrap">Hizmet adı</th>
                <th className="py-3 px-4 whitespace-nowrap">Çalışan</th>
                <th className="py-3 px-4 whitespace-nowrap text-right">İndirim tutarı</th>
                <th className="py-3 px-4 whitespace-nowrap text-right">Yapılan Ödeme</th>
                <th className="py-3 px-4 whitespace-nowrap text-right">Kalan Bakiye</th>
                <th className="py-3 px-4 w-[140px] text-right" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-400" />
                  </td>
                </tr>
              ) : !customerName ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-500">
                    Müşteri bulunamadı veya erişim yok.
                  </td>
                </tr>
              ) : slice.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-500">
                    {search ? "Arama sonucu yok." : "Bu müşteri için randevu yok."}
                  </td>
                </tr>
              ) : (
                slice.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-100 last:border-0 odd:bg-white even:bg-slate-50/60"
                  >
                    <td className="py-3 px-4 whitespace-nowrap text-slate-800 tabular-nums">
                      {r.dateLabel}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-2 text-slate-800">
                        <Calendar className="h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                        <span>{r.serviceLabel}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{r.employeeLabel}</td>
                    <td className="py-3 px-4 text-right tabular-nums text-slate-700">
                      {fmtMoney(r.discountAmt)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-medium text-slate-900">
                      {fmtMoney(r.linePaid)}
                    </td>
                    <td
                      className={cn(
                        "py-3 px-4 text-right tabular-nums font-medium",
                        r.balance > 0 ? "text-red-600" : "text-emerald-600"
                      )}
                    >
                      {fmtMoney(r.balance)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {r.balance > 0 ? (
                        <button
                          type="button"
                          className="text-sm font-medium text-blue-600 hover:underline"
                          onClick={() =>
                            setOdemeSheet({
                              mode: "pay",
                              appointmentId: r.id,
                              serviceLabel: r.serviceLabel,
                              tableLinePaid: r.linePaid,
                              randevuNet:
                                Math.round((r.linePaid + r.balance) * 100) / 100,
                            })
                          }
                        >
                          Ödeme Ekle +
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="text-sm font-medium text-blue-600 hover:underline"
                          onClick={() =>
                            setOdemeSheet({
                              mode: "history",
                              appointmentId: r.id,
                              serviceLabel: r.serviceLabel,
                              tableLinePaid: r.linePaid,
                              randevuNet:
                                Math.round((r.linePaid + r.balance) * 100) / 100,
                            })
                          }
                        >
                          Ödeme geçmişi
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-2 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between bg-slate-50/80">
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              aria-label="Önceki sayfa"
              disabled={pageSafe <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white",
                pageSafe <= 1 && "pointer-events-none opacity-40"
              )}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {totalPages <= 12 ? (
              Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={cn(
                    "min-w-9 px-2 py-1.5 text-sm tabular-nums rounded-md border",
                    pageSafe === n
                      ? "border-blue-600 bg-white font-semibold text-blue-700"
                      : "border-transparent hover:bg-white"
                  )}
                >
                  {n}
                </button>
              ))
            ) : (
              <span className="px-2 text-sm tabular-nums text-slate-700">
                {pageSafe} / {totalPages}
              </span>
            )}
            <button
              type="button"
              aria-label="Sonraki sayfa"
              disabled={pageSafe >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white",
                pageSafe >= totalPages && "pointer-events-none opacity-40"
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-slate-600">
            Toplam kayıt:{" "}
            <span className="font-semibold tabular-nums text-slate-900">
              {filtered.length}
            </span>{" "}
            adet
          </p>
        </div>
      </div>

      {odemeSheet != null && (
        <AppointmentOdemeSheet
          key={`${odemeSheet.appointmentId}-${odemeSheet.mode}`}
          open
          mode={odemeSheet.mode}
          appointmentId={odemeSheet.appointmentId}
          serviceLabel={odemeSheet.serviceLabel}
          randevuNet={odemeSheet.randevuNet}
          tableLinePaid={odemeSheet.tableLinePaid}
          customerId={customerId}
          customerName={customerName}
          onOpenChange={(o) => !o && setOdemeSheet(null)}
          onSaved={() => fetchData()}
        />
      )}
    </div>
  )
}
