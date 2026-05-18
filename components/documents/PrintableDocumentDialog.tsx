"use client"

import { useEffect, useRef, useState } from "react"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { Loader2, Printer } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useCompanyBranding } from "@/hooks/useCompanyBranding"
import type { PrintableDocumentPayload } from "@/lib/documents/receipt-types"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string | null
  payload: PrintableDocumentPayload | null
}

export function PrintableDocumentDialog({ open, onOpenChange, companyId, payload }: Props) {
  const { branding, loading } = useCompanyBranding(companyId)
  const [bodyText, setBodyText] = useState("")
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && payload) setBodyText(payload.defaultBody)
  }, [open, payload])

  function handlePrint() {
    const el = printRef.current
    if (!el) return
    const w = window.open("", "_blank", "width=800,height=900")
    if (!w) return
    w.document.write(`
      <!DOCTYPE html><html><head><meta charset="utf-8"/><title>${payload?.title ?? "Belge"}</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 24px; color: #0f172a; }
        .logo { max-height: 56px; max-width: 180px; object-fit: contain; }
        h1 { font-size: 18px; margin: 12px 0 4px; }
        .muted { color: #64748b; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
        td { padding: 6px 0; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
        td:last-child { text-align: right; font-weight: 500; }
        .total { font-size: 16px; font-weight: 700; margin-top: 12px; }
        .body { white-space: pre-wrap; font-size: 13px; line-height: 1.5; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
      </style></head><body>${el.innerHTML}</body></html>`)
    w.document.close()
    w.focus()
    w.print()
    w.close()
  }

  if (!payload) return null

  const printedAt = format(new Date(), "dd MMMM yyyy HH:mm", { locale: tr })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-slate-900">{payload.title}</h2>
        <p className="text-xs text-slate-500">Yazdırmadan önce metni düzenleyebilirsiniz.</p>

        <Label className="text-xs text-slate-500 mt-2">Belge metni</Label>
        <textarea
          className="w-full min-h-[120px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
        />

        <PrintPreview
          printRef={printRef}
          branding={branding}
          loading={loading}
          payload={payload}
          bodyText={bodyText}
          printedAt={printedAt}
        />

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
          <Button className="flex-1" onClick={handlePrint} disabled={loading}>
            <Printer className="h-4 w-4 mr-2" />
            Yazdır / PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function PrintPreview({
  printRef,
  branding,
  loading,
  payload,
  bodyText,
  printedAt,
}: {
  printRef: React.RefObject<HTMLDivElement>
  branding: ReturnType<typeof useCompanyBranding>["branding"]
  loading: boolean
  payload: PrintableDocumentPayload
  bodyText: string
  printedAt: string
}) {
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm">
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <div ref={printRef}>
          <DocumentPrintBody
            branding={branding}
            payload={payload}
            bodyText={bodyText}
            printedAt={printedAt}
          />
        </div>
      )}
    </div>
  )
}

function DocumentPrintBody({
  branding,
  payload,
  bodyText,
  printedAt,
}: {
  branding: ReturnType<typeof useCompanyBranding>["branding"]
  payload: PrintableDocumentPayload
  bodyText: string
  printedAt: string
}) {
  const addr = [branding?.address, branding?.city].filter(Boolean).join(", ")
  return (
    <>
      {branding?.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={branding.logo_url} alt="" className="logo h-14 object-contain" />
      ) : null}
      <h1>{branding?.name || "Şirket"}</h1>
      <p className="muted">
        {[branding?.phone, branding?.email, addr].filter(Boolean).join(" · ")}
      </p>
      {(branding?.tax_number || branding?.tax_office) && (
        <p className="muted">
          VKN: {branding.tax_number || "—"}
          {branding.tax_office ? ` · ${branding.tax_office}` : ""}
        </p>
      )}
      <h1 style={{ marginTop: 16 }}>{payload.title}</h1>
      {payload.subtitle ? <p className="muted">{payload.subtitle}</p> : null}
      <p className="muted">{printedAt}</p>
      {payload.customerName ? (
        <p style={{ marginTop: 8 }}>
          <strong>Müşteri:</strong> {payload.customerName}
        </p>
      ) : null}
      {payload.referenceNo ? (
        <p className="muted">Ref: {payload.referenceNo}</p>
      ) : null}
      <table>
        <tbody>
          {payload.lineItems.map((row) => (
            <tr key={row.label}>
              <td>{row.label}</td>
              <td>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {payload.paymentMethod ? (
        <p>
          <strong>Ödeme:</strong> {payload.paymentMethod}
        </p>
      ) : null}
      <p className="total">
        {payload.totalLabel || "Toplam"}: {payload.totalAmount}
      </p>
      <div className="body whitespace-pre-wrap text-sm leading-relaxed mt-4 pt-4 border-t border-slate-200">
        {bodyText}
      </div>
    </>
  )
}
