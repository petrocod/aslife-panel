"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { ChevronDown, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { DateInput } from "@/components/shared/DateInput"
import { supabaseData as supabase } from "@/lib/supabase-data"
import { DEMO_COMPANY_ID, useCompany } from "@/hooks/useCompany"
import { recordIncomeFromAppointmentPayment } from "@/lib/finance/integration"
import { mapUiPaymentToPaymentsDbMethod } from "@/lib/finance/payment-method-map"
import { cn } from "@/lib/utils"
import { PrintableDocumentDialog } from "@/components/documents/PrintableDocumentDialog"
import { usePrintableReceipt } from "@/hooks/usePrintableReceipt"
import {
  buildPaymentReceiptBody,
  mapPaymentMethodLabel,
  type PrintableDocumentPayload,
} from "@/lib/documents/receipt-types"

type SheetMode = "pay" | "history"

/** DB: payments (schema: method, paid_at — no payment_date / payment_method) */
type PaymentRow = {
  id: string
  amount: number
  paid_at: string | null
  method: string | null
  created_at?: string | null
}

type PendingLine = {
  id: string
  amount: number
  method: string
  payDate: string
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function fmtTry(n: number) {
  return `₺${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function mapMethodToLabel(m: string | null | undefined) {
  const x = (m ?? "").toLowerCase()
  if (x === "kart" || x === "pos" || x === "card") return "Kredi Kartı"
  if (x === "online") return "Online Ödeme"
  if (x === "havale" || x === "transfer") return "Havale"
  if (x === "nakit" || x === "cash") return "Nakit"
  return m || "—"
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: SheetMode
  customerId: string
  customerName: string
  appointmentId: string
  serviceLabel: string
  /** Randevu satırı net tutarı (indirim sonrası toplam) */
  randevuNet: number
  /** Liste yüklenmeden önce tablodaki bu randevunun ödenen toplamı (yarış/flaş önleme) */
  tableLinePaid: number
  onSaved: () => void
}

export function AppointmentOdemeSheet(props: Props) {
  const {
    open,
    onOpenChange,
    mode,
    customerId,
    customerName,
    appointmentId,
    serviceLabel,
    randevuNet,
    tableLinePaid,
    onSaved,
  } = props
  const { companyId } = useCompany()

  const [amountMode, setAmountMode] = useState<"try" | "pct">("try")
  const [amount, setAmount] = useState("")
  const [pct, setPct] = useState("")
  const [method, setMethod] = useState("nakit")
  const [payDate, setPayDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [saving, setSaving] = useState(false)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [payErr, setPayErr] = useState<string | null>(null)
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [pending, setPending] = useState<PendingLine[]>([])
  const [historyOpen, setHistoryOpen] = useState(true)

  const effectiveCompanyId = companyId || DEMO_COMPANY_ID
  const { receiptOpen, setReceiptOpen, receiptPayload, openReceipt } = usePrintableReceipt()

  const paidDb = useMemo(
    () => round2(payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)),
    [payments]
  )
  const paidForBalance = loadingList ? tableLinePaid : paidDb
  const pendingSum = useMemo(
    () => round2(pending.reduce((s, p) => s + p.amount, 0)),
    [pending]
  )
  /** Tahsil edilebilir üst sınır: kalan borç (aynı anda bekleyen satırlar dahil). Aşım yapılamaz */
  const remaining = useMemo(
    () => Math.max(0, round2(randevuNet - paidForBalance - pendingSum)),
    [randevuNet, paidForBalance, pendingSum]
  )
  /** Kayıtta randevu bedelinden fazla ödenmiş mi (ek tahsilata izin verilmez) */
  const overpaidVsRandevu = useMemo(() => {
    if (loadingList) return false
    return paidDb > round2(randevuNet + 0.009)
  }, [loadingList, paidDb, randevuNet])

  const parsedAmount = useMemo(() => {
    if (amountMode === "try") {
      return round2(Number(String(amount).replace(",", ".")) || 0)
    }
    const cap = remaining
    return round2((cap * (Number(String(pct).replace(",", ".")) || 0)) / 100)
  }, [amountMode, amount, pct, remaining])

  const loadPayments = useCallback(async () => {
    if (!appointmentId) return
    setLoadingList(true)
    const { data, error } = await supabase
      .from("payments")
      .select("id, amount, paid_at, method, created_at")
      .eq("appointment_id", appointmentId)
      .order("created_at", { ascending: false })

    if (error) {
      setLoadErr(error.message)
      setPayments([])
    } else {
      setLoadErr(null)
      setPayments((data ?? []) as PaymentRow[])
    }
    setLoadingList(false)
  }, [appointmentId])

  useEffect(() => {
    if (!open) return
    setPayErr(null)
    setLoadErr(null)
    setPending([])
    setHistoryOpen(true)
    if (mode === "pay") {
      setPct("")
      setAmountMode("try")
      setPayDate(format(new Date(), "yyyy-MM-dd"))
    }
  }, [open, appointmentId, mode])

  useEffect(() => {
    if (!open || !appointmentId) return
    void loadPayments()
  }, [open, appointmentId, loadPayments])

  useEffect(() => {
    if (!open || mode !== "pay") return
    if (loadingList) return
    setAmount(String(remaining))
  }, [open, mode, loadingList, remaining, appointmentId])

  async function insertOnePayment(
    pay: number,
    methodVal: string,
    payDateStr: string
  ): Promise<{ ok: true } | { ok: false; message: string }> {
    const { error } = await supabase.from("payments").insert({
      appointment_id: appointmentId,
      customer_id: customerId,
      company_id: effectiveCompanyId,
      amount: pay,
      method: mapUiPaymentToPaymentsDbMethod(methodVal),
      paid_at: `${payDateStr}T12:00:00.000Z`,
    })
    if (error) return { ok: false, message: error.message }
    return { ok: true }
  }

  function clampAmountToCeiling() {
    if (amountMode !== "try" || loadingList || mode !== "pay") return
    const n = round2(Number(String(amount).replace(",", ".")) || 0)
    if (n > remaining) setAmount(String(remaining))
  }

  function handleQueueAdd() {
    if (mode !== "pay") return
    if (overpaidVsRandevu) {
      setPayErr(
        "Bu randevu için kayıtlı tahsilat tutarı zaten randevu bedelini aşıyor; ek tahsilat eklenemez."
      )
      return
    }
    const pay = Math.min(parsedAmount, remaining)
    if (!Number.isFinite(pay) || pay <= 0) {
      setPayErr("Geçerli bir tutar girin.")
      return
    }
    if (pay > remaining + 0.01) {
      setPayErr("Tutar kalan borcu aşamaz; en fazla bu randevu için kalan tutar kadar tahsil eklenebilir.")
      return
    }
    setPayErr(null)
    const nextRemaining = Math.max(0, round2(randevuNet - paidForBalance - pendingSum - pay))
    setPending((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        amount: pay,
        method,
        payDate,
      },
    ])
    setPct("")
    setAmount(String(nextRemaining))
  }

  function removePendingLine(id: string) {
    setPending((prev) => prev.filter((x) => x.id !== id))
  }

  async function handleSaveBatch() {
    if (mode !== "pay" || pending.length === 0) return
    setSaving(true)
    setPayErr(null)
    try {
      for (const line of pending) {
        const ins = await insertOnePayment(line.amount, line.method, line.payDate)
        if (!ins.ok) {
          setPayErr(ins.message)
          setSaving(false)
          return
        }
        const { error: finErr } = await recordIncomeFromAppointmentPayment(supabase, {
          companyId: effectiveCompanyId,
          appointmentId,
          amount: line.amount,
          uiPaymentMethod: line.method,
          customerName,
        })
        if (finErr) {
          setPayErr(
            `Ödeme kaydedildi ancak Finans defterine yazılamadı: ${finErr.message}. SQL migrasyonlarını kontrol edin (finance_transactions.sql, finance_accounts_extension.sql).`
          )
          setSaving(false)
          await loadPayments()
          return
        }
      }
      const totalPaid = round2(pending.reduce((s, l) => s + l.amount, 0))
      const methods = [...new Set(pending.map((l) => mapPaymentMethodLabel(l.method)))].join(", ")
      const savedLines = [...pending]
      setPending([])
      await loadPayments()
      onSaved()
      onOpenChange(false)
      const payload: PrintableDocumentPayload = {
        title: "Ödeme Makbuzu",
        subtitle: serviceLabel,
        customerName,
        referenceNo: appointmentId.slice(0, 8).toUpperCase(),
        lineItems: savedLines.map((l, i) => ({
          label: `Ödeme ${i + 1} (${format(new Date(l.payDate + "T12:00:00"), "dd.MM.yyyy")})`,
          value: fmtTry(l.amount),
        })),
        totalAmount: fmtTry(totalPaid),
        paymentMethod: methods,
        defaultBody: buildPaymentReceiptBody(
          customerName,
          fmtTry(totalPaid),
          `${serviceLabel} randevusu`
        ),
      }
      openReceipt(payload)
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setPending([])
    onOpenChange(false)
  }

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="flex w-full flex-col overflow-hidden border-l border-neutral-200 bg-white p-0 sm:max-w-md"
        side="right"
      >
        <SheetHeader className="border-b border-neutral-200 bg-white px-5 py-4 text-left">
          <SheetTitle className="text-base font-semibold text-neutral-900">
            {mode === "history" ? "Ödeme geçmişi" : "Ödeme ekle"}
          </SheetTitle>
          {mode !== "history" && (
            <p className="mt-1 pr-8 text-xs leading-relaxed text-neutral-500">
              Oluşturmak istediğiniz alanı seçin ve kurallarını belirleyin
            </p>
          )}
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#fafafa] px-5 py-4">
          <div className="mb-4 rounded-2xl border border-neutral-200/90 bg-[#f5f5f5] px-4 py-3.5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                  Hizmet
                </p>
                <p className="mt-1 text-lg font-bold leading-snug text-neutral-900">{serviceLabel}</p>
                <p className="mt-1.5 text-xs tabular-nums text-neutral-600">
                  Randevu tutarı{" "}
                  <span className="font-semibold text-neutral-900">{fmtTry(randevuNet)}</span>
                  {" · "}
                  Ödenen{" "}
                  <span className="font-semibold text-neutral-900">
                    {loadingList ? "…" : fmtTry(paidDb)}
                  </span>
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[10px] text-neutral-500">Kalan bakiye</p>
                <div className="mt-0.5 flex items-center justify-end gap-1">
                  <button
                    type="button"
                    aria-label="Tutarı TL olarak gir"
                    onClick={() => setAmountMode("try")}
                    className={cn(
                      "rounded-full px-2 py-1 text-[11px] font-semibold transition-colors",
                      amountMode === "try"
                        ? "bg-neutral-700 text-white shadow-sm"
                        : "text-neutral-400 hover:bg-white/70"
                    )}
                  >
                    ₺
                  </button>
                  <button
                    type="button"
                    aria-label="Yüzde ile gir"
                    onClick={() => setAmountMode("pct")}
                    className={cn(
                      "rounded-full px-2 py-1 text-[11px] font-semibold transition-colors",
                      amountMode === "pct"
                        ? "bg-neutral-700 text-white shadow-sm"
                        : "text-neutral-400 hover:bg-white/70"
                    )}
                  >
                    %
                  </button>
                </div>
                <p
                  className={cn(
                    "mt-1 text-2xl font-bold tabular-nums tracking-tight",
                    loadingList
                      ? "text-neutral-400"
                      : remaining > 0.01
                        ? "text-amber-600"
                        : "text-emerald-600"
                  )}
                >
                  {loadingList ? "…" : fmtTry(remaining)}
                </p>
                {pendingSum > 0 && mode === "pay" && (
                  <p className="mt-1 text-[10px] leading-tight text-neutral-500">
                    + {fmtTry(pendingSum)} sıraya alındı
                  </p>
                )}
              </div>
            </div>
          </div>

          {!loadingList && overpaidVsRandevu && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950">
              Kayıtlı tahsilat bu randevu bedelini aşıyor. Ek tahsil eklenmez; gerekiyorsa kayıtları gözden
              geçirin.
            </div>
          )}

          {mode === "pay" && (
            <>
              <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
                <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-1">
                    <label className="mb-1 block text-[11px] font-medium text-neutral-500">
                      Ödenecek tutar
                    </label>
                    {amountMode === "try" ? (
                      <div className="flex h-10 items-center rounded-lg border border-neutral-200 bg-neutral-50/90 px-3">
                        <span className="mr-1.5 text-xs font-medium text-neutral-400">₺</span>
                        <input
                          type="number"
                          min={0}
                          max={remaining > 0 ? remaining : undefined}
                          step="0.01"
                          value={amount}
                          onBlur={clampAmountToCeiling}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full min-w-0 bg-transparent text-sm tabular-nums text-neutral-900 outline-none placeholder:text-neutral-400"
                          placeholder="0"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex h-10 items-center rounded-lg border border-neutral-200 bg-neutral-50/90 px-3">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step="0.1"
                            value={pct}
                            onChange={(e) => setPct(e.target.value)}
                            className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-neutral-400"
                            placeholder="0"
                          />
                          <span className="text-xs text-neutral-400">%</span>
                        </div>
                        <p className="text-[10px] text-neutral-500">
                          ≈ {fmtTry(Math.min(parsedAmount, remaining))}{" "}
                          <span className="opacity-75">(%{pct || "0"} · kalan tutar)</span>
                        </p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-neutral-500">
                      Ödeme şekli
                    </label>
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                      className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-2.5 text-sm text-neutral-900 outline-none focus:border-neutral-400"
                    >
                      <option value="nakit">Nakit</option>
                      <option value="kart">Kredi Kartı</option>
                      <option value="online">Online Ödeme</option>
                      <option value="havale">Havale</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-neutral-500">
                      Ödeme tarihi
                    </label>
                    <DateInput value={payDate} onChange={setPayDate} />
                  </div>
                </div>

                {!loadingList && remaining > 0 && !overpaidVsRandevu && (
                  <p className="mb-3 text-[11px] text-neutral-600">
                    Tek seferde en fazla{" "}
                    <span className="font-semibold text-neutral-800">{fmtTry(remaining)}</span> tahsil
                    eklenebilir (borcu kapatmak için üst sınır).
                  </p>
                )}

                {payErr && (
                  <p className="mb-3 rounded-lg border border-red-100 bg-red-50 px-2.5 py-2 text-xs text-red-700">
                    {payErr}
                  </p>
                )}

                <Button
                  type="button"
                  className={cn(
                    "h-10 w-full rounded-lg border-0 font-semibold text-white shadow-sm",
                    "bg-[#008cff] hover:bg-[#0078e8] disabled:opacity-50"
                  )}
                  disabled={
                    saving ||
                    loadingList ||
                    overpaidVsRandevu ||
                    remaining <= 0 ||
                    parsedAmount <= 0
                  }
                  onClick={handleQueueAdd}
                >
                  Ödemeyi gir
                </Button>
              </div>

              {pending.length > 0 && (
                <div className="mb-4 rounded-xl border border-neutral-200 bg-white px-3 py-3 shadow-sm">
                  <p className="mb-2 text-xs font-semibold text-neutral-800">Bu oturumda eklenecek</p>
                  <ul className="space-y-1.5">
                    {pending.map((line) => {
                      const d = line.payDate.includes("T")
                        ? format(new Date(line.payDate), "dd.MM.yyyy", { locale: tr })
                        : format(new Date(line.payDate + "T12:00:00"), "dd.MM.yyyy", { locale: tr })
                      return (
                        <li
                          key={line.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-neutral-100 bg-[#fafafa] py-2 pl-3 pr-2 text-xs"
                        >
                          <span className="text-neutral-600">
                            {d} · {mapMethodToLabel(line.method)}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold tabular-nums text-neutral-900">
                              {fmtTry(line.amount)}
                            </span>
                            <button
                              type="button"
                              aria-label="Satırı kaldır"
                              className="rounded p-1 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600"
                              onClick={() => removePendingLine(line.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </>
          )}

          <div>
            <button
              type="button"
              onClick={() => setHistoryOpen((v) => !v)}
              className="flex w-full items-center justify-between rounded-t-xl border border-b-0 border-neutral-200 bg-neutral-100 px-3 py-2.5 text-left transition-colors hover:bg-neutral-200/80"
            >
              <span className="text-xs font-semibold text-neutral-800">Ödeme geçmişi</span>
              <span className="flex items-center gap-1 text-[11px] font-medium text-[#008cff]">
                {historyOpen ? "Daralt" : "Tüm ödemeleri göster"}
                <ChevronDown
                  className={cn("h-4 w-4 shrink-0 transition-transform", historyOpen ? "rotate-180" : "rotate-0")}
                />
              </span>
            </button>
            <div
              className={cn(
                "rounded-b-xl border border-t-0 border-neutral-200 bg-white px-3 py-2 shadow-sm",
                !historyOpen && "hidden"
              )}
            >
              <p className="mb-2 text-[10px] leading-relaxed text-neutral-500">
                Bu randevuya ait kayıtlı ödemeler; başka satıra geçince liste o randevuya göre yenilenir.
              </p>
              {loadingList ? (
                <p className="py-5 text-center text-xs text-neutral-400">Yükleniyor…</p>
              ) : loadErr ? (
                <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">{loadErr}</p>
              ) : payments.length === 0 ? (
                <p className="py-5 text-center text-xs italic text-neutral-400">
                  Ödeme geçmişi bulunmamaktadır
                </p>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {payments.map((p) => {
                    const raw = p.paid_at ?? p.created_at
                    const d = raw
                      ? format(new Date(raw), "dd.MM.yyyy", { locale: tr })
                      : "—"
                    const ml = mapMethodToLabel(p.method)
                    return (
                      <div
                        key={p.id}
                        className="grid grid-cols-1 gap-1 py-2.5 text-xs sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-3"
                      >
                        <span className="tabular-nums text-neutral-600">{d}</span>
                        <span className="text-neutral-800">{ml}</span>
                        <span className="font-semibold tabular-nums text-neutral-900 sm:text-right">
                          {fmtTry(Number(p.amount) || 0)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <SheetFooter className="gap-2 border-t border-neutral-200 bg-white px-5 py-3 sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            className="font-medium text-neutral-700 hover:text-neutral-900"
            onClick={handleCancel}
          >
            Vazgeç
          </Button>
          {mode === "pay" ? (
            <Button
              type="button"
              disabled={saving || pending.length === 0}
              className={cn(
                "min-w-[7rem] rounded-lg font-semibold shadow-sm disabled:opacity-40",
                "bg-neutral-200 text-neutral-900 hover:bg-neutral-300 disabled:hover:bg-neutral-200"
              )}
              onClick={() => void handleSaveBatch()}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Kaydediliyor…
                </>
              ) : (
                "Kaydet"
              )}
            </Button>
          ) : (
            <Button type="button" variant="outline" className="rounded-lg" onClick={() => onOpenChange(false)}>
              Kapat
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
    <PrintableDocumentDialog
      open={receiptOpen}
      onOpenChange={setReceiptOpen}
      companyId={effectiveCompanyId}
      payload={receiptPayload}
    />
  </>
  )
}
