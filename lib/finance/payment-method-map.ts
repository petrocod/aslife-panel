import type { FinancePaymentMethod } from "@/types/finance"

/**
 * Tek kaynak: UI / DB’deki ödeme şekli → mali ledger (cash | pos | online).
 * Takvim: nakit / kart / havale — Ödemeler sayfası: nakit / cash / kart / online — hepsi burada birleşir.
 */
export function normalizeUiPaymentToLedger(raw: string | null | undefined): FinancePaymentMethod {
  const x = (raw || "").toLowerCase().trim()
  if (x === "kart" || x === "pos" || x === "card") return "pos"
  if (x === "havale" || x === "online" || x === "bank") return "online"
  return "cash"
}

/** Ödeme şekli seçenekleri (formlarda aynı value’ları kullanın) */
export const PAYMENT_METHOD_UI_OPTIONS = [
  { value: "nakit", label: "Nakit", ledger: "cash" as const },
  { value: "kart", label: "Kredi kartı / POS", ledger: "pos" as const },
  { value: "havale", label: "Havale / EFT / Online", ledger: "online" as const },
] as const

export function ledgerLabel(pm: FinancePaymentMethod): string {
  if (pm === "pos") return "POS / Kart"
  if (pm === "online") return "Online / Havale"
  return "Nakit"
}

/** جدول payments (ستون method): nakit/kart/havale → cash/card/transfer */
export function mapUiPaymentToPaymentsDbMethod(ui: string | null | undefined): string {
  const x = (ui || "").toLowerCase().trim()
  if (x === "kart" || x === "pos" || x === "card") return "card"
  if (x === "havale" || x === "online" || x === "transfer") return "transfer"
  return "cash"
}
