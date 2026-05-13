"use client"

export const dynamic = "force-dynamic"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  format,
  parseISO,
  isValid,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  subMonths,
  subDays,
  subYears,
} from "date-fns"
import { tr } from "date-fns/locale"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Download,
  Landmark,
  LayoutDashboard,
  Loader2,
  Plus,
  TrendingDown,
  TrendingUp,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { DateInput } from "@/components/shared/DateInput"
import { useCompany, DEMO_COMPANY_ID } from "@/hooks/useCompany"
import { supabaseData as supabase } from "@/lib/supabase-data"
import {
  createFinanceAccount,
  deactivateFinanceAccount,
  downloadTextFile,
  ensureDefaultFinanceAccounts,
  formatTransactionsAsCsv,
  formatTransactionsAsCsvTurkish,
  getCashFlowDailyForRange,
  getFinancialSummaryForRange,
  getOutstandingReceivables,
  getTopExpenseCategoriesForRange,
  getTransactionsList,
  getWalletBalances,
  getWalletBalancesForRange,
  listFinanceAccounts,
  listRecentInternalTransfers,
  recordInternalTransfer,
  recordTransaction,
  setFinanceAccountPaymentMapping,
} from "@/services/financeService"
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from "@/lib/finance/category-constants"
import { expenseCategoryLabel, incomeCategoryLabel } from "@/lib/finance/category-labels"
import { ledgerLabel, PAYMENT_METHOD_UI_OPTIONS } from "@/lib/finance/payment-method-map"
import type {
  FinanceAccountKind,
  FinanceAccountRow,
  FinancePaymentMethod,
  FinanceSettlementFlow,
  FinanceTransactionRow,
  OutstandingAppointmentRow,
  OutstandingPackageRow,
} from "@/types/finance"
import { cn } from "@/lib/utils"

const MANUAL_INCOME_OPTIONS = (Object.keys(INCOME_CATEGORIES) as Array<keyof typeof INCOME_CATEGORIES>).filter(
  (k) => k !== "clinic_service" && k !== "product_sale"
)

const EXPENSE_CATEGORY_OPTIONS = Object.keys(EXPENSE_CATEGORIES) as Array<keyof typeof EXPENSE_CATEGORIES>

const ACCOUNT_KINDS: { value: FinanceAccountKind; label: string }[] = [
  { value: "cash_register", label: "Nakit kasa" },
  { value: "online_gateway", label: "Banka / online tahsilat" },
  { value: "pos_clearing", label: "POS / kart" },
  { value: "petty_cash", label: "Tenzile (petty cash)" },
  { value: "receivable", label: "Müşteri alacağı" },
  { value: "installment_ledger", label: "Taksit defteri" },
  { value: "other", label: "Diğer" },
  { value: "bank", label: "Banka (eski kayıt)" },
]

const SETTLEMENT_LABELS: Record<FinanceSettlementFlow, string> = {
  settled: "Tahsil",
  receivable: "Alacak",
  installment: "Taksit / plan",
}

/** Asistan sayfasıyla aynı alt çizgili sekme stili */
const FINANCE_TAB_TRIGGER_CLASS =
  "inline-flex items-center rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 text-slate-600 px-3 pb-3 pt-2 text-sm gap-1.5"

const FINANCE_TAB_VALUES = ["overview", "income", "expense", "accounts", "receivables"] as const
type FinanceMainTab = (typeof FINANCE_TAB_VALUES)[number]
const RECEIVABLES_PAGE_SIZE = 5

type ReceivableTableRow = {
  id: string
  date: string | null
  customerName: string
  serviceName: string
  serviceType: "Bireysel" | "Paket"
  balance: number
  saleAmount: number
}

function isFinanceMainTab(v: string | null): v is FinanceMainTab {
  return v != null && (FINANCE_TAB_VALUES as readonly string[]).includes(v)
}

type ReportRangePreset =
  | "this_week"
  | "this_month"
  | "last_month"
  | "last7"
  | "last_12_months"
  | "custom"

function paymentMethodForAccount(a: FinanceAccountRow): FinancePaymentMethod {
  if (a.maps_payment_method) return a.maps_payment_method
  if (a.kind === "cash_register" || a.kind === "petty_cash") return "cash"
  if (a.kind === "bank" || a.kind === "online_gateway") return "online"
  if (a.kind === "pos_clearing") return "pos"
  return "cash"
}

function formatTry(n: number) {
  return `₺${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function parseYmd(s: string): Date | null {
  const d = parseISO(`${s}T12:00:00`)
  return isValid(d) ? d : null
}

function fmtWhen(iso: string) {
  try {
    return format(parseISO(iso), "d MMM yyyy HH:mm", { locale: tr })
  } catch {
    return iso
  }
}

export default function AdminFinancePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <AdminFinancePageInner />
    </Suspense>
  )
}

function AdminFinancePageInner() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tabFromUrl = searchParams.get("tab")
  const mainTab: FinanceMainTab = isFinanceMainTab(tabFromUrl) ? tabFromUrl : "overview"

  function setMainTab(next: FinanceMainTab) {
    const p = new URLSearchParams(searchParams.toString())
    if (next === "overview") p.delete("tab")
    else p.set("tab", next)
    const q = p.toString()
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
  }

  const { loading: companyLoading, companyId, userId, role } = useCompany()
  const cid = companyId || DEMO_COMPANY_ID

  const isEmployeeOnly = Boolean(userId && role === "employee")

  const [accountingEnabled, setAccountingEnabled] = useState(true)
  useEffect(() => {
    if (!cid) return
    supabase.from("settings").select("has_accounting_module").eq("company_id", cid).maybeSingle()
      .then(({ data }) => { if (data && data.has_accounting_module === false) setAccountingEnabled(false) })
  }, [cid])

  const [summaryLoading, setSummaryLoading] = useState(true)
  const [incomeMonth, setIncomeMonth] = useState(0)
  const [expenseMonth, setExpenseMonth] = useState(0)

  const [walletBalances, setWalletBalances] = useState<
    Array<{ id: string; name: string; kind: FinanceAccountKind; current_balance: number }>
  >([])
  const [periodLiquidityBalances, setPeriodLiquidityBalances] = useState<
    Array<{ id: string; name: string; kind: FinanceAccountKind; current_balance: number }>
  >([])
  const [cashFlow7, setCashFlow7] = useState<Array<{ date: string; income: number; expense: number }>>([])
  const [topExpenseCats, setTopExpenseCats] = useState<Array<{ category: string; total: number }>>([])
  const [internalTransfers, setInternalTransfers] = useState<
    Array<{
      id: string
      amount: number
      description: string | null
      created_at: string
      from_account_id: string
      to_account_id: string
    }>
  >([])

  const [txLoading, setTxLoading] = useState(true)
  const [incomeRows, setIncomeRows] = useState<FinanceTransactionRow[]>([])
  const [expenseRows, setExpenseRows] = useState<FinanceTransactionRow[]>([])
  const [settledIncomeOnly, setSettledIncomeOnly] = useState(true)

  const [expenseOpen, setExpenseOpen] = useState(false)
  const [expAmount, setExpAmount] = useState("")
  const [expCategory, setExpCategory] = useState<string>("operational")
  const [expAccountId, setExpAccountId] = useState("")
  const [expDesc, setExpDesc] = useState("")
  const [expSaving, setExpSaving] = useState(false)
  const [expError, setExpError] = useState("")

  const [incomeOpen, setIncomeOpen] = useState(false)
  const [incAmount, setIncAmount] = useState("")
  const [incCategory, setIncCategory] = useState("other_income")
  const [incAccountId, setIncAccountId] = useState("")
  const [incDesc, setIncDesc] = useState("")
  const [incSaving, setIncSaving] = useState(false)
  const [incError, setIncError] = useState("")

  const [transferFrom, setTransferFrom] = useState("")
  const [transferTo, setTransferTo] = useState("")
  const [transferAmount, setTransferAmount] = useState("")
  const [transferDesc, setTransferDesc] = useState("")
  const [transferSaving, setTransferSaving] = useState(false)
  const [transferError, setTransferError] = useState("")

  const [accounts, setAccounts] = useState<FinanceAccountRow[]>([])
  const [newAccName, setNewAccName] = useState("")
  const [newAccKind, setNewAccKind] = useState<FinanceAccountKind>("cash_register")
  const [newAccSaving, setNewAccSaving] = useState(false)

  const [outstanding, setOutstanding] = useState<{
    appointments: OutstandingAppointmentRow[]
    packages: OutstandingPackageRow[]
    totalBalance: number
  } | null>(null)
  const [receivablesPage, setReceivablesPage] = useState(1)

  const [rangeFrom, setRangeFromState] = useState(() =>
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  )
  const [rangeTo, setRangeToState] = useState(() => format(new Date(), "yyyy-MM-dd"))
  const [rangePreset, setRangePreset] = useState<ReportRangePreset>("this_month")

  function setRangeFrom(v: string) {
    setRangePreset("custom")
    setRangeFromState(v)
  }
  function setRangeTo(v: string) {
    setRangePreset("custom")
    setRangeToState(v)
  }

  function applyRangePreset(preset: ReportRangePreset) {
    if (preset === "custom") {
      setRangePreset("custom")
      return
    }
    setRangePreset(preset)
    const n = new Date()
    if (preset === "this_week") {
      setRangeFromState(format(startOfWeek(n, { weekStartsOn: 1 }), "yyyy-MM-dd"))
      setRangeToState(format(n, "yyyy-MM-dd"))
    } else if (preset === "this_month") {
      setRangeFromState(format(startOfMonth(n), "yyyy-MM-dd"))
      setRangeToState(format(n, "yyyy-MM-dd"))
    } else if (preset === "last_month") {
      const m = subMonths(n, 1)
      setRangeFromState(format(startOfMonth(m), "yyyy-MM-dd"))
      setRangeToState(format(endOfMonth(m), "yyyy-MM-dd"))
    } else if (preset === "last7") {
      setRangeFromState(format(subDays(n, 6), "yyyy-MM-dd"))
      setRangeToState(format(n, "yyyy-MM-dd"))
    } else if (preset === "last_12_months") {
      setRangeFromState(format(subYears(n, 1), "yyyy-MM-dd"))
      setRangeToState(format(n, "yyyy-MM-dd"))
    }
  }

  const periodRangeLabel = useMemo(() => {
    const a = parseYmd(rangeFrom)
    const b = parseYmd(rangeTo)
    if (!a || !b) return ""
    return `${format(a, "d MMM yyyy", { locale: tr })} – ${format(b, "d MMM yyyy", { locale: tr })}`
  }, [rangeFrom, rangeTo])

  const receivableRows = useMemo<ReceivableTableRow[]>(() => {
    if (!outstanding) return []
    const apps: ReceivableTableRow[] = outstanding.appointments.map((a) => ({
      id: `a-${a.id}`,
      date: a.appointment_date,
      customerName: a.customer_name,
      serviceName: a.service_name,
      serviceType: "Bireysel",
      balance: Number(a.balance) || 0,
      saleAmount: Number(a.price) || 0,
    }))
    const pkgs: ReceivableTableRow[] = outstanding.packages.map((p) => ({
      id: `p-${p.id}`,
      date: p.start_date,
      customerName: p.customer_name,
      serviceName: p.package_name,
      serviceType: "Paket",
      balance: Number(p.balance) || 0,
      saleAmount: Number(p.total_price) || 0,
    }))
    return [...apps, ...pkgs].sort((x, y) => {
      const tx = x.date ? parseISO(`${x.date}T12:00:00`).getTime() : 0
      const ty = y.date ? parseISO(`${y.date}T12:00:00`).getTime() : 0
      return ty - tx
    })
  }, [outstanding])

  const receivablesTotalPages = Math.max(1, Math.ceil(receivableRows.length / RECEIVABLES_PAGE_SIZE))
  const receivablesPageSafe = Math.min(receivablesPage, receivablesTotalPages)
  const receivablesRowsPage = useMemo(() => {
    const start = (receivablesPageSafe - 1) * RECEIVABLES_PAGE_SIZE
    return receivableRows.slice(start, start + RECEIVABLES_PAGE_SIZE)
  }, [receivableRows, receivablesPageSafe])

  const refresh = useCallback(async () => {
    if (isEmployeeOnly) return
    setSummaryLoading(true)
    setTxLoading(true)

    const fromD = parseYmd(rangeFrom)
    const toD = parseYmd(rangeTo)
    const rangeOk = Boolean(fromD && toD)

    await ensureDefaultFinanceAccounts(supabase, cid)

    const { data: acc } = await listFinanceAccounts(supabase, cid)
    setAccounts((acc || []).filter((a) => a.is_active))

    const [
      outRes,
      { data: sum, error: e1 },
      wbRes,
      wbPeriodRes,
      cfRes,
      topRes,
      itRes,
    ] = await Promise.all([
      rangeOk && fromD && toD
        ? getOutstandingReceivables(supabase, cid, { from: fromD, to: toD })
        : Promise.resolve({
            data: { appointments: [], packages: [], totalBalance: 0 },
            error: null as Error | null,
          }),
      rangeOk && fromD && toD
        ? getFinancialSummaryForRange(supabase, cid, fromD, toD)
        : Promise.resolve({ data: null, error: null as Error | null }),
      getWalletBalances(supabase, cid),
      rangeOk && fromD && toD
        ? getWalletBalancesForRange(supabase, cid, fromD, toD)
        : Promise.resolve({ data: [], error: null as Error | null }),
      rangeOk && fromD && toD
        ? getCashFlowDailyForRange(supabase, cid, fromD, toD)
        : Promise.resolve({ data: [], error: null as Error | null }),
      rangeOk && fromD && toD
        ? getTopExpenseCategoriesForRange(supabase, cid, fromD, toD, 5)
        : Promise.resolve({ data: [], error: null as Error | null }),
      listRecentInternalTransfers(supabase, cid, 20),
    ])

    if (outRes.error) {
      console.warn("[finance] alacak", outRes.error.message)
      setOutstanding(null)
    } else {
      setOutstanding(outRes.data ?? { appointments: [], packages: [], totalBalance: 0 })
    }

    setWalletBalances(wbRes.data ?? [])
    if (wbRes.error) console.warn("[finance] cüzdan", wbRes.error.message)

    setPeriodLiquidityBalances(wbPeriodRes.data ?? [])
    if (wbPeriodRes.error) console.warn("[finance] dönem likiditesi", wbPeriodRes.error.message)
    setCashFlow7(cfRes.data ?? [])
    if (cfRes.error) console.warn("[finance] nakit akışı", cfRes.error.message)
    setTopExpenseCats(topRes.data ?? [])
    if (topRes.error) console.warn("[finance] top gider", topRes.error.message)
    setInternalTransfers(itRes.data ?? [])
    if (itRes.error) console.warn("[finance] virman", itRes.error.message)

    setSummaryLoading(false)
    if (e1) {
      console.warn("[finance] özet", e1.message)
      setIncomeMonth(0)
      setExpenseMonth(0)
    } else if (sum) {
      setIncomeMonth(sum.income)
      setExpenseMonth(sum.expense)
    } else {
      setIncomeMonth(0)
      setExpenseMonth(0)
    }

    if (!rangeOk || !fromD || !toD) {
      const { data: list, error: e2 } = await getTransactionsList(supabase, cid, { limit: 100 })
      setTxLoading(false)
      if (e2) console.warn("[finance] liste", e2.message)
      const all = list || []
      setIncomeRows(all.filter((t) => t.type === "income"))
      setExpenseRows(all.filter((t) => t.type === "expense"))
      return
    }

    const { data: list, error: e2 } = await getTransactionsList(supabase, cid, {
      from: fromD,
      to: toD,
      limit: 500,
    })
    setTxLoading(false)
    if (e2) console.warn("[finance] liste", e2.message)
    const all = list || []
    setIncomeRows(all.filter((t) => t.type === "income"))
    setExpenseRows(all.filter((t) => t.type === "expense"))
  }, [cid, isEmployeeOnly, rangeFrom, rangeTo])

  const activeAccounts = accounts.filter((a) => a.is_active)

  useEffect(() => {
    if (companyLoading) return
    if (isEmployeeOnly) {
      setSummaryLoading(false)
      setTxLoading(false)
      return
    }
    void refresh()
  }, [companyLoading, isEmployeeOnly, refresh])

  useEffect(() => {
    if (activeAccounts.length === 0) return
    if (!activeAccounts.some((a) => a.id === incAccountId)) {
      const cash = activeAccounts.find((a) => a.kind === "cash_register")
      setIncAccountId((cash || activeAccounts[0]).id)
    }
    if (!activeAccounts.some((a) => a.id === expAccountId)) {
      const cash = activeAccounts.find((a) => a.kind === "cash_register" || a.kind === "petty_cash")
      setExpAccountId((cash || activeAccounts[0])?.id ?? "")
    }
  }, [activeAccounts, incAccountId, expAccountId])

  useEffect(() => {
    if (activeAccounts.length < 2) return
    if (!transferFrom || !activeAccounts.some((a) => a.id === transferFrom)) {
      const cash = activeAccounts.find((a) => a.kind === "cash_register")
      setTransferFrom((cash || activeAccounts[0]).id)
    }
    if (!transferTo || !activeAccounts.some((a) => a.id === transferTo)) {
      const bank = activeAccounts.find((a) => a.kind === "online_gateway" || a.kind === "bank")
      setTransferTo((bank || activeAccounts[1] || activeAccounts[0]).id)
    }
  }, [activeAccounts, transferFrom, transferTo])

  useEffect(() => {
    setReceivablesPage(1)
  }, [rangeFrom, rangeTo, receivableRows.length])

  function exportCsv(variant: "turkish" | "technical") {
    const merged = [...incomeRows, ...expenseRows].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    const csv =
      variant === "turkish"
        ? formatTransactionsAsCsvTurkish(merged, ";")
        : formatTransactionsAsCsv(merged, ";")
    downloadTextFile(`finans_${rangeFrom}_${rangeTo}.csv`, csv, "text/csv;charset=utf-8")
  }

  const financeToolbarDateRow = (
    <div
      className="flex flex-wrap items-end gap-x-3 gap-y-2"
      role="group"
      aria-label="Rapor tarih aralığı"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="whitespace-nowrap text-[10px] font-medium uppercase tracking-wide text-slate-500">
          Dönem
        </span>
        <Select
          value={rangePreset}
          onValueChange={(v) => applyRangePreset(v as ReportRangePreset)}
        >
          <SelectTrigger className="h-9 w-[min(100vw-2rem,220px)] text-xs sm:w-[220px]">
            <SelectValue placeholder="Dönem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this_week">Bu hafta (Pzt — bugün)</SelectItem>
            <SelectItem value="this_month">Bu ay</SelectItem>
            <SelectItem value="last_month">Geçen ay</SelectItem>
            <SelectItem value="last7">Son 7 gün</SelectItem>
            <SelectItem value="last_12_months">Son 12 ay (1 yıl)</SelectItem>
            <SelectItem value="custom">Özel aralık (manuel)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <Label className="whitespace-nowrap text-[10px] font-medium uppercase tracking-wide text-slate-500">
          Başlangıç
        </Label>
        <DateInput
          value={rangeFrom}
          onChange={setRangeFrom}
          max={rangeTo}
          className="h-9 w-[min(100vw-2rem,148px)] sm:w-[148px]"
          captionLayout="dropdown"
          accent="warm"
        />
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <Label className="whitespace-nowrap text-[10px] font-medium uppercase tracking-wide text-slate-500">
          Bitiş
        </Label>
        <DateInput
          value={rangeTo}
          onChange={setRangeTo}
          min={rangeFrom}
          className="h-9 w-[min(100vw-2rem,148px)] sm:w-[148px]"
          captionLayout="dropdown"
          accent="warm"
        />
      </div>
    </div>
  )

  async function submitExpense() {
    const amount = Number(expAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setExpError("Geçerli bir tutar girin.")
      return
    }
    if (!expAccountId) {
      setExpError("Kaynak hesap seçin.")
      return
    }
    const acc = accounts.find((a) => a.id === expAccountId)
    if (!acc) {
      setExpError("Hesap bulunamadı.")
      return
    }
    setExpError("")
    setExpSaving(true)
    const pm = paymentMethodForAccount(acc)
    const { error } = await recordTransaction(supabase, {
      companyId: cid,
      type: "expense",
      category: expCategory,
      amount,
      description: expDesc.trim() || null,
      paymentMethod: pm,
      financeAccountId: acc.id,
      settlementFlow: "settled",
    })
    setExpSaving(false)
    if (error) {
      setExpError(error.message)
      return
    }
    setExpenseOpen(false)
    setExpAmount("")
    setExpDesc("")
    void refresh()
  }

  async function submitIncome() {
    const amount = Number(incAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setIncError("Geçerli bir tutar girin.")
      return
    }
    if (!incAccountId) {
      setIncError("Hesap seçin.")
      return
    }
    const acc = accounts.find((a) => a.id === incAccountId)
    if (!acc) {
      setIncError("Hesap bulunamadı.")
      return
    }
    setIncError("")
    setIncSaving(true)
    const pm = paymentMethodForAccount(acc)
    const { error } = await recordTransaction(supabase, {
      companyId: cid,
      type: "income",
      category: incCategory,
      amount,
      description: incDesc.trim() || null,
      paymentMethod: pm,
      financeAccountId: acc.id,
      settlementFlow: "settled",
    })
    setIncSaving(false)
    if (error) {
      setIncError(error.message)
      return
    }
    setIncomeOpen(false)
    setIncAmount("")
    setIncDesc("")
    void refresh()
  }

  async function addAccount() {
    if (!newAccName.trim()) return
    setNewAccSaving(true)
    const { error } = await createFinanceAccount(supabase, {
      companyId: cid,
      name: newAccName.trim(),
      kind: newAccKind,
    })
    setNewAccSaving(false)
    if (error) {
      console.warn("[finance] hesap", error.message)
      return
    }
    setNewAccName("")
    void refresh()
  }

  async function mapAccountPayment(accountId: string, raw: string) {
    const v = raw === "__none__" ? null : (raw as FinancePaymentMethod)
    const { error } = await setFinanceAccountPaymentMapping(supabase, cid, accountId, v)
    if (error) console.warn(error.message)
    void refresh()
  }

  async function deactivateAcc(id: string) {
    if (!confirm("Bu hesabı pasifleştirmek istiyor musunuz?")) return
    const { error } = await deactivateFinanceAccount(supabase, cid, id)
    if (error) console.warn(error.message)
    void refresh()
  }

  async function submitInternalTransfer() {
    const amount = Number(transferAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setTransferError("Geçerli bir tutar girin.")
      return
    }
    if (transferFrom === transferTo) {
      setTransferError("Kaynak ve hedef hesap farklı olmalı.")
      return
    }
    setTransferError("")
    setTransferSaving(true)
    const { error } = await recordInternalTransfer(
      supabase,
      cid,
      transferFrom,
      transferTo,
      amount,
      transferDesc.trim() || undefined
    )
    setTransferSaving(false)
    if (error) {
      setTransferError(error.message)
      return
    }
    setTransferAmount("")
    setTransferDesc("")
    void refresh()
  }

  if (companyLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (isEmployeeOnly) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-amber-200 bg-amber-50/80 p-6 text-center text-sm text-amber-900">
        <p className="font-semibold">Bu sayfaya erişim yetkiniz yok.</p>
        <p className="mt-2 text-amber-800/90">
          Finans özeti ve manuel gider girişi yalnızca şirket sahibi ve yöneticiler içindir.
        </p>
      </div>
    )
  }

  if (!accountingEnabled) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-700 mt-10">
        <p className="font-semibold text-base mb-2">Muhasebe modülü devre dışı</p>
        <p className="text-slate-500">
          Bu özellik henüz aktif değil. Ayarlar &gt; Abonelik ve Erişim sayfasından etkinleştirebilirsiniz.
        </p>
      </div>
    )
  }

  const totalLiquidity = periodLiquidityBalances.reduce((s, w) => s + w.current_balance, 0)
  const netMonth = incomeMonth - expenseMonth
  const displayIncomeRows = settledIncomeOnly
    ? incomeRows.filter((t) => (t.settlement_flow ?? "settled") === "settled")
    : incomeRows
  const cashFlowMax = Math.max(1, ...cashFlow7.flatMap((d) => [d.income, d.expense]))
  const cashFlowAllQuiet =
    cashFlow7.length > 0 && cashFlow7.every((d) => d.income === 0 && d.expense === 0)

  function rowForTransaction(t: FinanceTransactionRow) {
    const flow = (t.settlement_flow ?? "settled") as FinanceSettlementFlow
    const catLabel =
      t.type === "income" ? incomeCategoryLabel(t.category) : expenseCategoryLabel(t.category)
    return (
      <tr key={t.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{fmtWhen(t.created_at)}</td>
        <td className="px-4 py-3 text-slate-700">{catLabel}</td>
        <td
          className={cn(
            "px-4 py-3 font-semibold tabular-nums",
            t.type === "income" ? "text-emerald-700" : "text-rose-700"
          )}
        >
          {t.type === "income" ? "+" : "−"}
          {formatTry(Number(t.amount))}
        </td>
        <td className="px-4 py-3 text-slate-600">{ledgerLabel(t.payment_method)}</td>
        <td className="max-w-[120px] truncate px-4 py-3 text-slate-600" title={t.finance_accounts?.name}>
          {t.finance_accounts?.name ?? "—"}
        </td>
        <td className="px-4 py-3">
          <span
            className={cn(
              "inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium",
              flow === "settled" && "bg-slate-100 text-slate-700",
              flow === "receivable" && "bg-amber-100 text-amber-900",
              flow === "installment" && "bg-sky-100 text-sky-900"
            )}
          >
            {SETTLEMENT_LABELS[flow]}
          </span>
        </td>
        <td className="max-w-[200px] truncate px-4 py-3 text-slate-600" title={t.description || ""}>
          {t.description || "—"}
        </td>
      </tr>
    )
  }

  return (
    <div className="w-full space-y-6 px-4 pb-10 pt-2 sm:px-6 lg:px-8">
      <Tabs
        value={mainTab}
        onValueChange={(v) => setMainTab(v as FinanceMainTab)}
        className="space-y-6"
      >
        <div className="w-full border-b border-slate-200">
          <TabsList className="flex h-auto w-full min-w-0 flex-wrap justify-start gap-0 rounded-none border-0 bg-transparent p-0">
            <TabsTrigger value="overview" className={FINANCE_TAB_TRIGGER_CLASS}>
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              Özet
            </TabsTrigger>
            <TabsTrigger value="income" className={FINANCE_TAB_TRIGGER_CLASS}>
              <TrendingUp className="h-4 w-4 shrink-0" />
              Gelirler
            </TabsTrigger>
            <TabsTrigger value="expense" className={FINANCE_TAB_TRIGGER_CLASS}>
              <TrendingDown className="h-4 w-4 shrink-0" />
              Giderler
            </TabsTrigger>
            <TabsTrigger value="accounts" className={FINANCE_TAB_TRIGGER_CLASS}>
              <Landmark className="h-4 w-4 shrink-0" />
              Hesaplar &amp; virman
            </TabsTrigger>
            <TabsTrigger value="receivables" className={FINANCE_TAB_TRIGGER_CLASS}>
              <CircleDollarSign className="h-4 w-4 shrink-0" />
              Alacaklar
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">{financeToolbarDateRow}</div>
          <div className="flex shrink-0 flex-wrap items-end justify-start gap-2 sm:justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  disabled={txLoading || (incomeRows.length === 0 && expenseRows.length === 0)}
                >
                  <Download className="h-4 w-4" />
                  Dışa aktar
                  <ChevronDown className="h-4 w-4 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[14rem]">
                <DropdownMenuItem onClick={() => exportCsv("turkish")}>
                  CSV — Excel uyumlu (Türkçe sütunlar, <span className="font-mono text-[11px]">;</span>)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportCsv("technical")}>
                  CSV — teknik (İngilizce alan adları)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button type="button" variant="outline" className="gap-2" onClick={() => setIncomeOpen(true)}>
              <Plus className="h-4 w-4" />
              Manuel gelir
            </Button>
            <Button type="button" className="gap-2" onClick={() => setExpenseOpen(true)}>
              <Plus className="h-4 w-4" />
              Manuel gider
            </Button>
          </div>
        </div>

        <TabsContent value="overview" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="order-2 border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white sm:order-1">
              <CardHeader className="pb-2">
                <CardDescription className="text-emerald-700/80">
                  <span className="block font-medium">Toplam gelir</span>
                </CardDescription>
                <CardTitle className="flex items-center gap-2 text-2xl text-emerald-900 tabular-nums">
                  <TrendingUp className="h-6 w-6 text-emerald-600" />
                  {summaryLoading ? "…" : formatTry(incomeMonth)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-emerald-800/70">
                Otomatik randevu / paket kayıtları ve bu sayfadan girdiğiniz gelirler (deftere düşen tutarlar).
              </CardContent>
            </Card>
            <Card className="order-3 border-rose-100 bg-gradient-to-br from-rose-50/80 to-white sm:order-2">
              <CardHeader className="pb-2">
                <CardDescription className="text-rose-700/80">
                  <span className="block font-medium">Toplam gider</span>
                </CardDescription>
                <CardTitle className="flex items-center gap-2 text-2xl text-rose-900 tabular-nums">
                  <TrendingDown className="h-6 w-6 text-rose-600" />
                  {summaryLoading ? "…" : formatTry(expenseMonth)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-rose-800/70">
                Manuel ve ileride entegre gider satırları.
              </CardContent>
            </Card>
            <Card className="order-1 border-slate-200 bg-gradient-to-br from-slate-50/90 to-white sm:order-3">
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-600">
                  <span className="block font-medium">Net</span>
                </CardDescription>
                <CardTitle
                  className={cn(
                    "flex items-center gap-2 text-2xl tabular-nums",
                    summaryLoading ? "text-slate-900" : netMonth >= 0 ? "text-emerald-900" : "text-rose-900"
                  )}
                >
                  <CircleDollarSign
                    className={cn(
                      "h-6 w-6 shrink-0",
                      summaryLoading ? "text-slate-500" : netMonth >= 0 ? "text-emerald-600" : "text-rose-600"
                    )}
                  />
                  {summaryLoading ? "…" : formatTry(netMonth)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-600">
                Gelir eksi gider (üstteki tarih aralığına göre).
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Toplam likidite</CardTitle>
                <CardDescription>
                  Üstte seçilen dönemde, hesap bazında net hareket: gelir − gider − çıkan virman + giren virman
                  (defter satırlarının oluşturulma tarihine göre). Hesaplar sekmesindeki tahmini bakiye tüm zamanı
                  kapsar.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums text-slate-900">{formatTry(totalLiquidity)}</p>
                <ul className="mt-3 max-h-48 space-y-1 overflow-auto text-sm text-slate-600">
                  {summaryLoading ? (
                    <li className="text-slate-400">Yükleniyor…</li>
                  ) : periodLiquidityBalances.length === 0 ? (
                    <li className="text-slate-400">Bu aralıkta hesaba bağlı hareket yok veya tarih geçersiz</li>
                  ) : (
                    periodLiquidityBalances.map((w) => (
                      <li key={w.id} className="flex justify-between gap-2 border-b border-slate-50 py-1">
                        <span className="truncate">{w.name}</span>
                        <span className="shrink-0 tabular-nums font-medium">{formatTry(w.current_balance)}</span>
                      </li>
                    ))
                  )}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Alacaklar</CardTitle>
                <CardDescription>
                  Aynı tarih aralığında: randevu alacakları randevu tarihine göre; paket alacakları geçerlilik
                  süresi bu aralıkla kesişen satırlardan. Henüz tahsil edilmemiş tutarlar.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-2xl font-bold tabular-nums text-slate-900">
                  {summaryLoading ? "…" : outstanding ? formatTry(outstanding.totalBalance) : "—"}
                </p>
                {outstanding && (
                  <p className="text-sm text-slate-600">
                    {outstanding.appointments.length} açık randevu kalemi ·{" "}
                    {outstanding.packages.length} açık paket kalemi
                  </p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => setMainTab("receivables")}
                >
                  Detaylı liste
                  <ChevronRight className="h-4 w-4 opacity-70" aria-hidden />
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Nakit akışı (günlük)</CardTitle>
                <CardDescription>
                  {periodRangeLabel ? (
                    <span className="block">{periodRangeLabel}</span>
                  ) : null}
                  Her sütun bir gün; yeşil: gelir, kırmızı: gider. Uzun aralıklarda yatay kaydırın.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative w-full overflow-x-auto border-b border-slate-200 pb-1">
                  <div className="relative flex h-40 min-h-[10rem] min-w-min items-end gap-0.5 px-0.5">
                  {cashFlow7.length === 0 ? (
                    <p className="w-full min-w-[12rem] text-center text-sm text-slate-400">Veri yok</p>
                  ) : (
                    cashFlow7.map((d) => (
                      <div key={d.date} className="flex w-8 shrink-0 flex-col items-center gap-1">
                        <div className="flex h-full w-full items-end justify-center gap-0.5">
                          <div
                            className="max-h-full w-2 rounded-t bg-emerald-500/85"
                            style={{
                              height:
                                d.income <= 0 ? "0%" : `${Math.max(4, (d.income / cashFlowMax) * 100)}%`,
                            }}
                            title={`Gelir ${d.income}`}
                          />
                          <div
                            className="max-h-full w-2 rounded-t bg-rose-500/85"
                            style={{
                              height:
                                d.expense <= 0 ? "0%" : `${Math.max(4, (d.expense / cashFlowMax) * 100)}%`,
                            }}
                            title={`Gider ${d.expense}`}
                          />
                        </div>
                        <span className="max-w-full truncate text-center text-[9px] text-slate-500">
                          {d.date.slice(5)}
                        </span>
                      </div>
                    ))
                  )}
                  {cashFlowAllQuiet ? (
                    <p className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 px-2 text-center text-xs text-slate-400">
                      Bu dönemde günlük gelir/gider kaydı yok (tüm günler sıfır).
                    </p>
                  ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">En çok gider kalemleri</CardTitle>
              {periodRangeLabel ? (
                <CardDescription className="text-xs">{periodRangeLabel}</CardDescription>
              ) : null}
            </CardHeader>
            <CardContent>
              {topExpenseCats.length === 0 ? (
                <p className="text-sm text-slate-500">Seçili aralıkta gider kaydı yok.</p>
              ) : (
                <ul className="space-y-2">
                  {topExpenseCats.map((x) => (
                    <li key={x.category} className="flex justify-between text-sm">
                      <span>{expenseCategoryLabel(x.category)}</span>
                      <span className="font-medium tabular-nums text-rose-800">{formatTry(x.total)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income" className="mt-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                className="rounded border-slate-300"
                checked={settledIncomeOnly}
                onChange={(e) => setSettledIncomeOnly(e.target.checked)}
              />
              Yalnızca tahsil edilmiş (kesin gelir)
            </label>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Tarih</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Tutar</th>
                  <th className="px-4 py-3">Ödeme</th>
                  <th className="px-4 py-3">Hesap</th>
                  <th className="px-4 py-3">Mutabakat</th>
                  <th className="px-4 py-3">Açıklama</th>
                </tr>
              </thead>
              <tbody>
                {txLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </td>
                  </tr>
                ) : displayIncomeRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                      Bu aralıkta gelir yok veya filtreyi genişletin.
                    </td>
                  </tr>
                ) : (
                  displayIncomeRows.map((t) => rowForTransaction(t))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="expense" className="mt-4 space-y-3">
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Tarih</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Tutar</th>
                  <th className="px-4 py-3">Ödeme</th>
                  <th className="px-4 py-3">Hesap</th>
                  <th className="px-4 py-3">Mutabakat</th>
                  <th className="px-4 py-3">Açıklama</th>
                </tr>
              </thead>
              <tbody>
                {txLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </td>
                  </tr>
                ) : expenseRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                      Bu aralıkta gider kaydı yok.
                    </td>
                  </tr>
                ) : (
                  expenseRows.map((t) => rowForTransaction(t))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="accounts" className="mt-4 space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Kasa &amp; banka (ledger hesapları)</CardTitle>
              <CardDescription>
                Randevu / ödeme ekranındaki <strong>Ödeme şekli</strong> (nakit, kart, havale) ile aynı mantık:
                her yöntem tek bir aktif hesaba eşlenir (nakit→kasa, kart→POS, havale/online→banka veya online
                hesabı). Aşağıdan eşlemeyi güncelleyebilirsiniz.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-medium uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Ad</th>
                      <th className="px-3 py-2">Tür</th>
                      <th className="px-3 py-2">Ödeme eşlemesi</th>
                      <th className="px-3 py-2">Tahmini bakiye</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {activeAccounts.map((a) => (
                      <tr key={a.id} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-medium text-slate-800">{a.name}</td>
                        <td className="px-3 py-2 text-slate-600">
                          {ACCOUNT_KINDS.find((k) => k.value === a.kind)?.label ?? a.kind}
                        </td>
                        <td className="px-3 py-2">
                          <Select
                            value={a.maps_payment_method ?? "__none__"}
                            onValueChange={(v) => void mapAccountPayment(a.id, v)}
                          >
                            <SelectTrigger className="h-8 w-[200px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">— (eşleme yok)</SelectItem>
                              {PAYMENT_METHOD_UI_OPTIONS.map((o) => (
                                <SelectItem key={o.value} value={o.ledger}>
                                  {o.label} → defter: {o.ledger}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2 tabular-nums text-slate-700">
                          {formatTry(walletBalances.find((w) => w.id === a.id)?.current_balance ?? 0)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-xs text-red-600"
                            onClick={() => void deactivateAcc(a.id)}
                          >
                            Pasifleştir
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-2 rounded-lg border border-dashed border-slate-200 p-3 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Yeni hesap adı</Label>
                  <Input
                    value={newAccName}
                    onChange={(e) => setNewAccName(e.target.value)}
                    placeholder="Örn. Ana kasa"
                  />
                </div>
                <div className="w-full sm:w-48">
                  <Label className="text-xs">Tür</Label>
                  <Select value={newAccKind} onValueChange={(v) => setNewAccKind(v as FinanceAccountKind)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_KINDS.map((k) => (
                        <SelectItem key={k.value} value={k.value}>
                          {k.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="button" disabled={newAccSaving || !newAccName.trim()} onClick={() => void addAccount()}>
                  Hesap ekle
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">İç transfer (virman)</CardTitle>
              <CardDescription>
                Örn. kasadan bankaya yatırım — bu gider değildir; sadece hesaplar arası bakiye kaydırır.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {transferError && (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {transferError}
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Kaynak hesap</Label>
                  <Select value={transferFrom} onValueChange={setTransferFrom}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {activeAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Hedef hesap</Label>
                  <Select value={transferTo} onValueChange={setTransferTo}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {activeAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Tutar (₺)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    className="mt-1"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Not (isteğe bağlı)</Label>
                  <Input className="mt-1" value={transferDesc} onChange={(e) => setTransferDesc(e.target.value)} />
                </div>
              </div>
              <Button type="button" onClick={() => void submitInternalTransfer()} disabled={transferSaving}>
                {transferSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Virman kaydet
              </Button>
              <div className="rounded-lg border border-slate-100">
                <p className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-medium uppercase text-slate-500">
                  Son virmanlar
                </p>
                <ul className="divide-y divide-slate-50 text-sm">
                  {internalTransfers.length === 0 ? (
                    <li className="px-3 py-4 text-center text-slate-400">Kayıt yok</li>
                  ) : (
                    internalTransfers.map((it) => (
                      <li key={it.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                        <span className="text-slate-600">
                          {accounts.find((x) => x.id === it.from_account_id)?.name ?? it.from_account_id.slice(0, 8)}{" "}
                          →{" "}
                          {accounts.find((x) => x.id === it.to_account_id)?.name ?? it.to_account_id.slice(0, 8)}
                        </span>
                        <span className="font-medium tabular-nums">{formatTry(Number(it.amount))}</span>
                        <span className="w-full text-xs text-slate-400">{fmtWhen(it.created_at)}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receivables" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tahsil edilmemiş bakiye (alacak)</CardTitle>
              <CardDescription>
                Özet kartı ile aynı dönem filtresine göre listelenir: randevularda randevu tarihi, paketlerde
                geçerlilik aralığı ile kesişim. Randevu fiyatından ödemeler düşülür; paket satırlarında toplam ücret
                − ödenen tutar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="font-semibold text-slate-800">
                Toplam açık bakiye:{" "}
                <span className="tabular-nums text-slate-900">
                  {outstanding ? formatTry(outstanding.totalBalance) : "…"}
                </span>
              </p>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[920px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/90 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-4 py-3">Randevu tarihi</th>
                        <th className="px-4 py-3">Müşteri adı</th>
                        <th className="px-4 py-3">Hizmet adı</th>
                        <th className="px-4 py-3">Hizmet tipi</th>
                        <th className="px-4 py-3 text-right">Kalan bakiye</th>
                        <th className="px-4 py-3 text-right">Satış tutarı</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receivablesRowsPage.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                            Seçili aralıkta açık alacak kaydı yok
                          </td>
                        </tr>
                      ) : (
                        receivablesRowsPage.map((r) => (
                          <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/40">
                            <td className="px-4 py-3 text-slate-700">
                              {r.date ? format(parseISO(`${r.date}T12:00:00`), "dd.MM.yyyy") : "—"}
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-800">{r.customerName}</td>
                            <td className="px-4 py-3 text-slate-700">{r.serviceName}</td>
                            <td className="px-4 py-3 text-slate-600">{r.serviceType}</td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-800">
                              {formatTry(r.balance)}
                            </td>
                            <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-700">
                              {formatTry(r.saleAmount)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-3 py-2.5 text-xs text-slate-600">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      disabled={receivablesPageSafe <= 1}
                      onClick={() => setReceivablesPage((p) => Math.max(1, p - 1))}
                      aria-label="Önceki sayfa"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    {Array.from({ length: receivablesTotalPages }, (_, i) => i + 1)
                      .slice(Math.max(0, receivablesPageSafe - 3), receivablesPageSafe + 2)
                      .map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setReceivablesPage(p)}
                          className={cn(
                            "h-7 min-w-7 rounded-md border px-2 text-[11px] font-medium",
                            p === receivablesPageSafe
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      disabled={receivablesPageSafe >= receivablesTotalPages}
                      onClick={() => setReceivablesPage((p) => Math.min(receivablesTotalPages, p + 1))}
                      aria-label="Sonraki sayfa"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p>Toplam kayıt: {receivableRows.length} adet</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={incomeOpen} onOpenChange={setIncomeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manuel gelir (kasa / banka)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {incError && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {incError}
              </p>
            )}
            <div>
              <Label className="text-xs text-slate-600">Tutar (₺)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={incAmount}
                onChange={(e) => setIncAmount(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-600">Kategori</Label>
              <Select value={incCategory} onValueChange={setIncCategory}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MANUAL_INCOME_OPTIONS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {INCOME_CATEGORIES[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-600">Hedef hesap</Label>
              <Select value={incAccountId} onValueChange={setIncAccountId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Seçin" />
                </SelectTrigger>
                <SelectContent>
                  {activeAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ({ACCOUNT_KINDS.find((k) => k.value === a.kind)?.label})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-[11px] text-slate-500">
                Ödeme yöntemi satırı, hesap türüne göre otomatik atanır (kasa → nakit, banka → online).
              </p>
            </div>
            <div>
              <Label className="text-xs text-slate-600">Açıklama</Label>
              <Textarea
                value={incDesc}
                onChange={(e) => setIncDesc(e.target.value)}
                className="mt-1.5 min-h-[72px] resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" type="button" onClick={() => setIncomeOpen(false)}>
              Vazgeç
            </Button>
            <Button type="button" onClick={() => void submitIncome()} disabled={incSaving}>
              {incSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manuel gider</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {expError && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {expError}
              </p>
            )}
            <div>
              <Label className="text-xs text-slate-600">Tutar (₺)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                className="mt-1.5"
                placeholder="0,00"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-600">Kategori</Label>
              <Select value={expCategory} onValueChange={setExpCategory}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORY_OPTIONS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {EXPENSE_CATEGORIES[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-600">Kaynak hesap (ödeme çıkışı)</Label>
              <Select value={expAccountId} onValueChange={setExpAccountId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Seçin" />
                </SelectTrigger>
                <SelectContent>
                  {activeAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ({ACCOUNT_KINDS.find((k) => k.value === a.kind)?.label})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-[11px] text-slate-500">
                Defter satırındaki ödeme tipi hesap eşlemesinden türetilir (nakit / POS / online).
              </p>
            </div>
            <div>
              <Label className="text-xs text-slate-600">Açıklama</Label>
              <Textarea
                value={expDesc}
                onChange={(e) => setExpDesc(e.target.value)}
                className="mt-1.5 min-h-[80px] resize-none"
                placeholder="Örn. temizlik malzemesi, kırtasiye…"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" type="button" onClick={() => setExpenseOpen(false)}>
              Vazgeç
            </Button>
            <Button type="button" onClick={() => void submitExpense()} disabled={expSaving}>
              {expSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
