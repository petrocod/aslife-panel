import type { SupabaseClient } from "@supabase/supabase-js"

import {
  recordTransaction,
  resolveDefaultFinanceAccountByMethod,
  resolveFinanceAccountByKind,
} from "@/services/financeService"
import type { FinancePaymentMethod } from "@/types/finance"

import { normalizeUiPaymentToLedger } from "@/lib/finance/payment-method-map"
import { logBusinessEvent } from "@/lib/finance/accounting-port"

/** تقویم / فرم‌ها: nakit,kart,havale,cash,online → ledger */
export function mapUiPaymentMethodToFinance(ui: string): FinancePaymentMethod {
  return normalizeUiPaymentToLedger(ui)
}

/** Fire-and-forget event log (never blocks UI) */
function logEvent(client: SupabaseClient, companyId: string, type: string, data: Record<string, unknown>) {
  logBusinessEvent(client, companyId, type, data).catch(() => {})
}

export async function recordIncomeFromAppointmentPayment(
  client: SupabaseClient,
  params: {
    companyId: string
    appointmentId: string
    amount: number
    uiPaymentMethod: string
    customerName?: string | null
  }
) {
  logEvent(client, params.companyId, "appointment_payment", { amount: params.amount, appointmentId: params.appointmentId, customer: params.customerName })
  const pm = mapUiPaymentMethodToFinance(params.uiPaymentMethod)
  const accountId = await resolveDefaultFinanceAccountByMethod(client, params.companyId, pm)
  const desc = params.customerName
    ? `Randevu ödemesi — ${params.customerName}`
    : "Randevu ödemesi"
  return recordTransaction(client, {
    companyId: params.companyId,
    type: "income",
    category: "clinic_service",
    amount: params.amount,
    description: desc,
    referenceId: params.appointmentId,
    paymentMethod: pm,
    financeAccountId: accountId,
    settlementFlow: "settled",
  })
}

/**
 * وقتی وضعیت رزرو به completed می‌رسد و هیچ payment ثبت نشده باشد،
 * به‌عنوان alacak (receivable) ثبت می‌شود تا با tahsil با «Müşteri alacakları» همخوان باشد.
 */
export async function maybeRecordIncomeOnAppointmentCompleted(
  client: SupabaseClient,
  params: {
    companyId: string
    appointmentId: string
    price: number | null | undefined
    customerName?: string | null
  }
) {
  const price = params.price != null ? Number(params.price) : 0
  if (!Number.isFinite(price) || price <= 0) return { error: null as Error | null }

  const { count, error: cErr } = await client
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("appointment_id", params.appointmentId)

  if (cErr) return { error: new Error(cErr.message) }
  if ((count ?? 0) > 0) return { error: null as Error | null }

  const accountId = await resolveFinanceAccountByKind(client, params.companyId, "receivable")
  const desc = params.customerName
    ? `Randevu tamamlandı (ödeme kaydı yok) — ${params.customerName}`
    : "Randevu tamamlandı (ödeme kaydı yok)"

  return recordTransaction(client, {
    companyId: params.companyId,
    type: "income",
    category: "clinic_service",
    amount: price,
    description: desc,
    referenceId: params.appointmentId,
    paymentMethod: "cash",
    financeAccountId: accountId,
    settlementFlow: "receivable",
  })
}

/** Paket satışı: POS/plan bağlamı için settlement_flow = installment */
export async function recordIncomeFromPackageSale(
  client: SupabaseClient,
  params: {
    companyId: string
    customerPackageId: string
    amount: number
    packageName?: string | null
  }
) {
  logEvent(client, params.companyId, "package_sale", { amount: params.amount, packageId: params.customerPackageId, name: params.packageName })
  const pm: FinancePaymentMethod = "cash"
  const accountId = await resolveDefaultFinanceAccountByMethod(client, params.companyId, pm)
  const desc = params.packageName
    ? `Paket satışı: ${params.packageName}`
    : "Paket satışı"
  return recordTransaction(client, {
    companyId: params.companyId,
    type: "income",
    category: "product_sale",
    amount: params.amount,
    description: desc,
    referenceId: params.customerPackageId,
    paymentMethod: pm,
    financeAccountId: accountId,
    settlementFlow: "installment",
  })
}

/** Müşteri paketi için taksit / ek tahsilat (Ödemeler / paket detay) */
export async function recordIncomeFromPackageInstallmentPayment(
  client: SupabaseClient,
  params: {
    companyId: string
    customerPackageId: string
    amount: number
    uiPaymentMethod: string
    customerName?: string | null
    packageName?: string | null
  }
) {
  logEvent(client, params.companyId, "package_installment", { amount: params.amount, packageId: params.customerPackageId, customer: params.customerName })
  const pm = mapUiPaymentMethodToFinance(params.uiPaymentMethod)
  const accountId = await resolveDefaultFinanceAccountByMethod(client, params.companyId, pm)
  const pkg = params.packageName?.trim() || "Paket"
  const cust = params.customerName?.trim()
  const desc = cust ? `Paket tahsilatı — ${pkg} — ${cust}` : `Paket tahsilatı — ${pkg}`
  return recordTransaction(client, {
    companyId: params.companyId,
    type: "income",
    category: "product_sale",
    amount: params.amount,
    description: desc,
    referenceId: params.customerPackageId,
    paymentMethod: pm,
    financeAccountId: accountId,
    settlementFlow: "settled",
  })
}

/** Platform abonelik/paket satın alımı (gider olarak kaydedilir) */
export async function recordExpenseFromPlatformPurchase(
  client: SupabaseClient,
  params: {
    companyId: string
    transactionId: string
    amount: number
    type: string
    description: string
  }
) {
  logEvent(client, params.companyId, "platform_purchase", { amount: params.amount, type: params.type, txnId: params.transactionId })
  const accountId = await resolveDefaultFinanceAccountByMethod(client, params.companyId, "online")
  return recordTransaction(client, {
    companyId: params.companyId,
    type: "expense",
    category: "platform_subscription",
    amount: params.amount,
    description: params.description,
    referenceId: params.transactionId,
    paymentMethod: "online",
    financeAccountId: accountId,
    settlementFlow: "settled",
  })
}

/** Fiziksel ürün satışı (Ürünler sayfası) */
export async function recordIncomeFromProductSale(
  client: SupabaseClient,
  params: {
    companyId: string
    saleId: string
    amount: number
    uiPaymentMethod: string
    productName?: string | null
  }
) {
  logEvent(client, params.companyId, "product_sale", { amount: params.amount, saleId: params.saleId, product: params.productName })
  const pm = mapUiPaymentMethodToFinance(params.uiPaymentMethod)
  const accountId = await resolveDefaultFinanceAccountByMethod(client, params.companyId, pm)
  const desc = params.productName
    ? `Ürün satışı: ${params.productName}`
    : "Ürün satışı"
  return recordTransaction(client, {
    companyId: params.companyId,
    type: "income",
    category: "product_sale",
    amount: params.amount,
    description: desc,
    referenceId: params.saleId,
    paymentMethod: pm,
    financeAccountId: accountId,
    settlementFlow: "settled",
  })
}
