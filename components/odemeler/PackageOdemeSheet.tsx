"use client"

import { useCallback, useEffect, useState } from "react"
import { format, parseISO } from "date-fns"
import { tr } from "date-fns/locale"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DateInput } from "@/components/shared/DateInput"
import { supabaseData as supabase } from "@/lib/supabase-data"
import { DEMO_COMPANY_ID, useCompany } from "@/hooks/useCompany"
import { mapUiPaymentToPaymentsDbMethod } from "@/lib/finance/payment-method-map"
import { recordIncomeFromPackageInstallmentPayment } from "@/lib/finance/integration"
import { PrintableDocumentDialog } from "@/components/documents/PrintableDocumentDialog"
import { usePrintableReceipt } from "@/hooks/usePrintableReceipt"
import {
  buildPaymentReceiptBody,
  mapPaymentMethodLabel,
} from "@/lib/documents/receipt-types"

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function fmtTry(n: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(n)
}

function paymentMethodDbToLabel(m: string | null | undefined) {
  const x = (m ?? "").toLowerCase()
  if (x === "kart" || x === "pos" || x === "card") return "Kredi Kartı"
  if (x === "online") return "Online Ödeme"
  if (x === "havale" || x === "transfer") return "Havale"
  if (x === "nakit" || x === "cash") return "Nakit"
  return m || "—"
}

type PaymentRow = {
  id: string
  amount: number
  paid_at: string | null
  method: string | null
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId: string
  customerPackageId: string
  customerName: string
  packageName: string
  /** Paket satış tutarı */
  totalPrice: number
  /** Güncel ödenen toplam (customer_packages.total_paid) */
  totalPaid: number
  onSaved: () => void
}

export function PackageOdemeSheet(props: Props) {
  const {
    open,
    onOpenChange,
    customerId,
    customerPackageId,
    customerName,
    packageName,
    totalPrice,
    totalPaid,
    onSaved,
  } = props
  const { companyId } = useCompany()
  const effectiveCompanyId = companyId || DEMO_COMPANY_ID
  const { receiptOpen, setReceiptOpen, receiptPayload, openReceipt } = usePrintableReceipt()

  const remaining = Math.max(0, round2(Number(totalPrice) - Number(totalPaid)))

  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState("nakit")
  const [payDate, setPayDate] = useState(() => format(new Date(), "yyyy-MM-dd"))
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState<string | null>(null)
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [showHistory, setShowHistory] = useState(true)

  const loadPayments = useCallback(async () => {
    setLoadingList(true)
    const { data, error } = await supabase
      .from("payments")
      .select("id, amount, paid_at, method")
      .eq("company_id", effectiveCompanyId)
      .eq("customer_id", customerId)
      .is("appointment_id", null)
      .like("notes", `%${customerPackageId}%`)
      .order("paid_at", { ascending: false })

    if (error) {
      setPayments([])
    } else {
      setPayments((data ?? []) as PaymentRow[])
    }
    setLoadingList(false)
  }, [effectiveCompanyId, customerId, customerPackageId])

  useEffect(() => {
    if (!open) return
    setSaveErr(null)
    setPayDate(format(new Date(), "yyyy-MM-dd"))
    setMethod("nakit")
    void loadPayments()
  }, [open, loadPayments])

  useEffect(() => {
    if (!open) return
    setAmount(String(remaining))
  }, [open, remaining])

  async function handleSave() {
    const pay = round2(Number(String(amount).replace(",", ".")) || 0)
    if (!Number.isFinite(pay) || pay <= 0) {
      setSaveErr("Geçerli bir tutar girin.")
      return
    }
    if (pay > remaining + 0.009) {
      setSaveErr("Tutar kalan bakiyeden fazla olamaz.")
      return
    }

    setSaving(true)
    setSaveErr(null)

    const paidAtIso = `${payDate}T12:00:00.000Z`
    const notes = `Paket ödemesi — ${packageName} [${customerPackageId}]`

    const { data: inserted, error: insErr } = await supabase
      .from("payments")
      .insert({
        company_id: effectiveCompanyId,
        customer_id: customerId,
        appointment_id: null,
        amount: pay,
        method: mapUiPaymentToPaymentsDbMethod(method),
        paid_at: paidAtIso,
        notes,
      })
      .select("id")
      .maybeSingle()

    if (insErr || !inserted?.id) {
      setSaving(false)
      setSaveErr(insErr?.message ?? "Ödeme kaydı oluşturulamadı.")
      return
    }

    const newPaid = round2(Number(totalPaid) + pay)
    const { error: updErr } = await supabase
      .from("customer_packages")
      .update({
        total_paid: newPaid,
        updated_at: new Date().toISOString(),
      })
      .eq("id", customerPackageId)

    if (updErr) {
      await supabase.from("payments").delete().eq("id", inserted.id)
      setSaving(false)
      setSaveErr(updErr.message)
      return
    }

    const { error: finErr } = await recordIncomeFromPackageInstallmentPayment(supabase, {
      companyId: effectiveCompanyId,
      customerPackageId,
      amount: pay,
      uiPaymentMethod: method,
      customerName,
      packageName,
    })
    setSaving(false)

    if (finErr) {
      setSaveErr(
        `Ödeme kaydedildi; Finans defterine yazılamadı: ${finErr.message}`
      )
    }

    void loadPayments()
    onSaved()
    if (!finErr) {
      onOpenChange(false)
      openReceipt({
        title: "Paket Ödeme Makbuzu",
        subtitle: packageName,
        customerName,
        referenceNo: customerPackageId.slice(0, 8).toUpperCase(),
        lineItems: [
          { label: "Paket", value: packageName },
          { label: "Ödeme tarihi", value: format(parseISO(payDate), "dd.MM.yyyy") },
        ],
        totalAmount: fmtTry(pay),
        paymentMethod: mapPaymentMethodLabel(method),
        defaultBody: buildPaymentReceiptBody(
          customerName,
          fmtTry(pay),
          `"${packageName}" paketi taksit ödemesi`
        ),
      })
    }
  }

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-md">
        <SheetHeader className="border-b border-slate-100 px-6 pb-4 pt-6 pr-12 text-left">
          <SheetTitle>Ödeme ekle</SheetTitle>
          <p className="text-sm font-normal text-slate-500">
            Oluşturmak istediğiniz alanı seçin ve kurallarını belirleyin
          </p>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">{packageName}</p>
              <p className="text-xs text-slate-500 mt-0.5">{customerName}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-slate-400">Kalan bakiye</p>
              <p className="text-base font-bold tabular-nums text-slate-800">{fmtTry(remaining)}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-1">
            <div>
              <Label className="text-xs text-slate-500">Ödenecek tutar</Label>
              <div className="mt-1 flex h-9 items-center rounded-md border border-slate-200 bg-white px-2">
                <span className="text-xs text-slate-400">₺</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="ml-1 flex-1 bg-transparent text-sm outline-none"
                  placeholder="0,00"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Ödeme şekli</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nakit">Nakit</SelectItem>
                  <SelectItem value="kart">Kredi Kartı</SelectItem>
                  <SelectItem value="havale">Havale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Ödeme tarihi</Label>
              <div className="mt-1">
                <DateInput value={payDate} onChange={setPayDate} />
              </div>
            </div>
          </div>

          {saveErr && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {saveErr}
            </p>
          )}

          <Button
            type="button"
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={saving || remaining <= 0}
            onClick={() => void handleSave()}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Kaydediliyor…
              </>
            ) : (
              "Ödemeyi gir"
            )}
          </Button>

          <div className="border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className="flex w-full items-center justify-between text-xs font-medium text-slate-600"
            >
              <span>Ödeme geçmişi</span>
              <span className="text-blue-600">
                {showHistory ? "Gizle ↑" : "Tüm ödemeleri göster ↓"}
              </span>
            </button>
            {showHistory && (
              <div className="mt-2 space-y-1">
                {loadingList ? (
                  <p className="py-3 text-center text-xs text-slate-400">Yükleniyor…</p>
                ) : payments.length === 0 ? (
                  <p className="py-2 text-center text-xs italic text-slate-400">
                    Ödeme geçmişi bulunmamaktadır
                  </p>
                ) : (
                  payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between border-b border-slate-100 py-1.5 text-xs"
                    >
                      <span className="text-slate-600">
                        {(p.paid_at &&
                          format(parseISO(p.paid_at), "dd.MM.yyyy", { locale: tr })) ||
                          "—"}{" "}
                        • {paymentMethodDbToLabel(p.method)}
                      </span>
                      <span className="font-semibold tabular-nums text-slate-800">
                        {fmtTry(Number(p.amount))}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="border-t border-slate-100">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button
            type="button"
            className="bg-blue-600 hover:bg-blue-700"
            disabled={saving || remaining <= 0}
            onClick={() => void handleSave()}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kaydet"}
          </Button>
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
