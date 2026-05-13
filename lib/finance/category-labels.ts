import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from "./category-constants"

export { INCOME_CATEGORIES, EXPENSE_CATEGORIES }

const LEGACY_INCOME: Record<string, keyof typeof INCOME_CATEGORIES> = {
  appointment: "clinic_service",
  clinic_service: "clinic_service",
  product_sale: "product_sale",
  other_income: "other_income",
  manual_cash_in: "manual_cash_in",
  bank_deposit: "bank_deposit",
}

const LEGACY_EXPENSE: Record<string, keyof typeof EXPENSE_CATEGORIES> = {
  utility: "fixed",
  salary: "payroll",
  supplies: "operational",
  operational: "operational",
  payroll: "payroll",
  fixed: "fixed",
  marketing: "marketing",
  other: "other",
}

export function incomeCategoryLabel(code: string): string {
  const k = LEGACY_INCOME[code] ?? (code in INCOME_CATEGORIES ? (code as keyof typeof INCOME_CATEGORIES) : null)
  if (k && k in INCOME_CATEGORIES) return INCOME_CATEGORIES[k]
  return code
}

export function expenseCategoryLabel(code: string): string {
  const k = LEGACY_EXPENSE[code] ?? (code in EXPENSE_CATEGORIES ? (code as keyof typeof EXPENSE_CATEGORIES) : null)
  if (k && k in EXPENSE_CATEGORIES) return EXPENSE_CATEGORIES[k]
  return code
}
