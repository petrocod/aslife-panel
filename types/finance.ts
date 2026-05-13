export type FinanceTransactionType = "income" | "expense"

export type FinancePaymentMethod = "cash" | "pos" | "online"

/** Tahsilat durumu: tahsil / alacak / taksit bağlamı */
export type FinanceSettlementFlow = "settled" | "receivable" | "installment"

export type FinanceAccountKind =
  | "cash_register"
  | "online_gateway"
  | "pos_clearing"
  | "receivable"
  | "installment_ledger"
  | "petty_cash"
  | "other"
  /** Eski kayıtlar (migration öncesi) */
  | "bank"

export type FinanceInternalTransferRow = {
  id: string
  company_id: string
  from_account_id: string
  to_account_id: string
  amount: number
  description: string | null
  created_at: string
}

export type FinanceAccountRow = {
  id: string
  company_id: string
  name: string
  kind: FinanceAccountKind
  maps_payment_method: FinancePaymentMethod | null
  is_active: boolean
  created_at: string
}

export type FinanceTransactionRow = {
  id: string
  company_id: string
  created_at: string
  type: FinanceTransactionType
  category: string
  amount: number
  description: string | null
  reference_id: string | null
  payment_method: FinancePaymentMethod
  finance_account_id: string | null
  settlement_flow: FinanceSettlementFlow
  finance_accounts?: { name: string; kind: FinanceAccountKind } | null
}

export type FinanceSummaryBucket = {
  income: number
  expense: number
}

export type FinanceSummary = {
  today: FinanceSummaryBucket
  thisMonth: FinanceSummaryBucket
  allTime: FinanceSummaryBucket
}

/** جمع درآمد / هزینه / خالص برای بازهٔ انتخاب‌شده */
export type FinanceRangeSummary = {
  income: number
  expense: number
  net: number
}

export type OutstandingAppointmentRow = {
  id: string
  appointment_date: string | null
  customer_name: string
  service_name: string
  status: string
  price: number
  paid: number
  balance: number
}

export type OutstandingPackageRow = {
  id: string
  start_date: string | null
  customer_name: string
  package_name: string
  status: string
  total_price: number
  total_paid: number
  balance: number
}
