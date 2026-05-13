import type { SupabaseClient } from "@supabase/supabase-js"

type RecordResult = { error: Error | null }

export type AccountingEvent = {
  companyId: string
  eventType: string
  amount: number
  description: string
  referenceId?: string
  paymentMethod?: string
  metadata?: Record<string, unknown>
}

export interface AccountingPort {
  recordIncome(client: SupabaseClient, event: AccountingEvent): Promise<RecordResult>
  recordExpense(client: SupabaseClient, event: AccountingEvent): Promise<RecordResult>
}

const NOOP_RESULT: RecordResult = { error: null }

class NoopAccountingAdapter implements AccountingPort {
  async recordIncome(): Promise<RecordResult> { return NOOP_RESULT }
  async recordExpense(): Promise<RecordResult> { return NOOP_RESULT }
}

class RealAccountingAdapter implements AccountingPort {
  async recordIncome(client: SupabaseClient, event: AccountingEvent): Promise<RecordResult> {
    const { recordTransaction, resolveDefaultFinanceAccountByMethod } = await import("@/services/financeService")
    const pm = (event.paymentMethod as "cash" | "pos" | "online") || "cash"
    const accountId = await resolveDefaultFinanceAccountByMethod(client, event.companyId, pm)
    return recordTransaction(client, {
      companyId: event.companyId,
      type: "income",
      category: event.eventType,
      amount: event.amount,
      description: event.description,
      referenceId: event.referenceId,
      paymentMethod: pm,
      financeAccountId: accountId,
      settlementFlow: "settled",
    })
  }

  async recordExpense(client: SupabaseClient, event: AccountingEvent): Promise<RecordResult> {
    const { recordTransaction, resolveDefaultFinanceAccountByMethod } = await import("@/services/financeService")
    const pm = (event.paymentMethod as "cash" | "pos" | "online") || "online"
    const accountId = await resolveDefaultFinanceAccountByMethod(client, event.companyId, pm)
    return recordTransaction(client, {
      companyId: event.companyId,
      type: "expense",
      category: event.eventType,
      amount: event.amount,
      description: event.description,
      referenceId: event.referenceId,
      paymentMethod: pm,
      financeAccountId: accountId,
      settlementFlow: "settled",
    })
  }
}

const noopAdapter = new NoopAccountingAdapter()
const realAdapter = new RealAccountingAdapter()

/**
 * Returns the correct accounting adapter based on feature flag.
 * Always logs the event to business_events regardless of flag.
 */
export async function getAccountingPort(
  client: SupabaseClient,
  companyId: string
): Promise<AccountingPort> {
  const { data } = await client
    .from("settings")
    .select("has_accounting_module")
    .eq("company_id", companyId)
    .maybeSingle()

  if (data?.has_accounting_module === false) {
    return noopAdapter
  }
  return realAdapter
}

/**
 * Log a business event (always runs, regardless of accounting module status).
 * This ensures financial history is preserved for future reconstruction.
 */
export async function logBusinessEvent(
  client: SupabaseClient,
  companyId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<void> {
  await client.from("business_events").insert({
    company_id: companyId,
    event_type: eventType,
    payload,
  })
}
