"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Plus, Search, Loader2, Filter, ChevronDown, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabaseData } from "@/lib/supabase-data"
import { useCompany, DEMO_COMPANY_ID } from "@/hooks/useCompany"
import { recordIncomeFromPackageSale } from "@/lib/finance/integration"
import { cn } from "@/lib/utils"
import { DateInput } from "@/components/shared/DateInput"
import {
  PackageSaleSuccessDialog,
  type PackageSaleSuccessInfo,
} from "@/components/paketler/PackageSaleSuccessDialog"

// ── Types ──────────────────────────────────────────────────────────────────
type Package = {
  id: string
  name: string
  usage_period: string
  price: number
  package_services: { services: { name: string } | null }[]
}
type Customer = { id: string; full_name: string; phone: string }

const PERIOD_LABELS: Record<string, string> = {
  none:       "Kullanım süresi yok",
  "1_month":  "1 Ay",
  "3_months": "3 Ay",
  "6_months": "6 Ay",
  "1_year":   "1 Yıl",
}

// ── Satış Panel ────────────────────────────────────────────────────────────
function SatisPanel({
  pkg,
  customers,
  companyId,
  onClose,
  onSaved,
  onSaleSuccess,
}: {
  pkg: Package
  customers: Customer[]
  companyId: string | null
  onClose: () => void
  onSaved: () => void
  onSaleSuccess?: (info: PackageSaleSuccessInfo) => void
}) {
  const today = format(new Date(), "yyyy-MM-dd")

  const [customerId,    setCustomerId]    = useState("")
  const [saleDate,      setSaleDate]      = useState(today)
  const [startDate,     setStartDate]     = useState(today)
  const [endDate,       setEndDate]       = useState(today)
  const [fee,           setFee]           = useState(String(pkg.price))
  const [lastPayDate,   setLastPayDate]   = useState("")
  const [discountVal,   setDiscountVal]   = useState("0")
  const [discountType,  setDiscountType]  = useState<"amount" | "percent">("amount")
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState("")

  const basePrice = Number(fee) || 0
  const discount  = discountType === "percent"
    ? (basePrice * (Number(discountVal) || 0)) / 100
    : (Number(discountVal) || 0)
  const total = Math.max(0, basePrice - discount)

  async function handleSave() {
    if (!customerId) { setError("Müşteri seçiniz."); return }
    if (!saleDate)   { setError("Paket satış tarihi zorunludur."); return }
    setError(""); setSaving(true)

    const effectiveCompanyId = companyId || DEMO_COMPANY_ID
    const { data: row, error: e } = await supabaseData.from("customer_packages").insert({
      company_id:  effectiveCompanyId,
      customer_id: customerId,
      package_id:  pkg.id,
      start_date:  startDate,
      end_date:    endDate || null,
      status:      "active",
      total_price: total,
      total_paid:  0,
    }).select("id").single()

    setSaving(false)
    if (e) { setError(e.message); return }
    if (row?.id) {
      const { error: finErr } = await recordIncomeFromPackageSale(supabaseData, {
        companyId: effectiveCompanyId,
        customerPackageId: row.id,
        amount: total,
        packageName: pkg.name,
      })
      if (finErr) console.warn("[finance] paket satışı:", finErr.message)
      const cname = customers.find((c) => c.id === customerId)?.full_name ?? ""
      onSaleSuccess?.({
        packageId: pkg.id,
        customerPackageId: row.id,
        customerId,
        packageName: pkg.name,
        customerName: cname,
      })
    }
    onSaved()
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-[420px] bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-200 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-800">
              {pkg.name} – Paket satışı
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Paket satışı sonrasında paketi planlamayı unutma
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 mt-0.5">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Müşteri adı */}
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Müşteri adı *</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Müşterinizi seçin" />
              </SelectTrigger>
              <SelectContent>
                {customers.length === 0 ? (
                  <SelectItem value="_" disabled>Henüz müşteri yok</SelectItem>
                ) : customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Paket satış tarihi */}
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Paket satış tarihi *</Label>
            <DateInput value={saleDate} onChange={setSaleDate} />
          </div>

          {/* Başlangıç + Bitiş tarihi */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Başlangıç tarihi</Label>
              <DateInput value={startDate} onChange={setStartDate} />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Bitiş tarihi</Label>
              <DateInput value={endDate} onChange={setEndDate} />
            </div>
          </div>

          {/* Paket ücreti */}
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Paket ücreti</Label>
            <div className="flex items-center border border-slate-200 rounded-md h-9 px-3 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
              <span className="text-slate-400 text-sm mr-1">₺</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                className="flex-1 text-sm outline-none bg-transparent"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Son ödeme tarihi */}
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Son ödeme tarihi</Label>
            <DateInput value={lastPayDate} onChange={setLastPayDate} />
          </div>

          {/* İndirim tutarı */}
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">İndirim tutarı</Label>
            <div className="flex items-center border border-slate-200 rounded-md h-9 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white">
              <span className="text-slate-400 text-sm ml-3 mr-1">₺</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discountVal}
                onChange={(e) => setDiscountVal(e.target.value)}
                className="flex-1 text-sm outline-none bg-transparent"
                placeholder="0.00"
              />
              {/* ₺/% toggle */}
              <div className="flex shrink-0 border-l border-slate-200 divide-x divide-slate-200 h-full">
                <button
                  onClick={() => setDiscountType("amount")}
                  className={cn(
                    "px-2.5 text-sm font-medium transition-colors h-full",
                    discountType === "amount" ? "bg-slate-800 text-white" : "bg-white text-slate-500 hover:bg-slate-50"
                  )}
                >₺</button>
                <button
                  onClick={() => setDiscountType("percent")}
                  className={cn(
                    "px-2.5 text-sm font-medium transition-colors h-full",
                    discountType === "percent" ? "bg-slate-800 text-white" : "bg-white text-slate-500 hover:bg-slate-50"
                  )}
                >%</button>
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">İndirim</span>
              <span className="font-medium text-slate-700">
                {discount > 0 ? `-₺${discount.toFixed(2)}` : "₺0,00"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm border-t border-slate-200 pt-2 mt-2">
              <span className="font-semibold text-slate-700">Toplam paket ücreti</span>
              <span className="font-bold text-slate-800 text-base">₺{total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-200 shrink-0">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Vazgeç</Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Kaydet
          </Button>
        </div>
      </div>
    </>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function PaketlerPage() {
  const router = useRouter()
  const { companyId } = useCompany()

  const [search,      setSearch]      = useState("")
  const [packages,    setPackages]    = useState<Package[]>([])
  const [customers,   setCustomers]   = useState<Customer[]>([])
  const [loading,     setLoading]     = useState(true)
  const [satisPkg,    setSatisPkg]    = useState<Package | null>(null)
  const [saleSuccess, setSaleSuccess] = useState<PackageSaleSuccessInfo | null>(null)
  const [saleDialogOpen, setSaleDialogOpen] = useState(false)

  // Filter by hizmet
  const [showHizmetFilter, setShowHizmetFilter] = useState(false)
  const [allServices,      setAllServices]      = useState<string[]>([])
  const [selServices,      setSelServices]      = useState<string[]>([])
  const filterRef = useRef<HTMLDivElement>(null)

  const cid = companyId || DEMO_COMPANY_ID

  const fetchPackages = useCallback(async () => {
    setLoading(true)
    const { data } = await supabaseData
      .from("packages")
      .select("id, name, usage_period, price, package_services(services(name))")
      .eq("company_id", cid)
      .order("created_at", { ascending: false })
    const pkgs = (data as unknown as Package[]) || []
    setPackages(pkgs)

    // collect all unique service names
    const svcSet = new Set<string>()
    pkgs.forEach((p) => p.package_services.forEach((ps) => { if (ps.services?.name) svcSet.add(ps.services.name) }))
    setAllServices(Array.from(svcSet).sort())
    setLoading(false)
  }, [cid])

  useEffect(() => { fetchPackages() }, [fetchPackages])

  useEffect(() => {
    supabaseData.from("customers").select("id, full_name, phone").eq("company_id", cid).order("full_name")
      .then(({ data }) => setCustomers((data as Customer[]) || []))
  }, [cid])

  // close filter on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowHizmetFilter(false)
      }
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [])

  const filtered = packages.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchFilter = selServices.length === 0 || p.package_services.some((ps) => ps.services?.name && selServices.includes(ps.services.name))
    return matchSearch && matchFilter
  })

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3 shrink-0">
        {/* Hizmetler filter */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setShowHizmetFilter((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 h-9 px-3.5 text-sm font-medium rounded-lg border transition-colors",
              selServices.length > 0
                ? "bg-blue-50 border-blue-300 text-blue-700"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            Hizmetler
            {selServices.length > 0 && (
              <span className="ml-1 bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {selServices.length}
              </span>
            )}
            <ChevronDown className="h-3.5 w-3.5 ml-0.5" />
          </button>

          {showHizmetFilter && (
            <div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-xl border border-slate-200 shadow-lg z-30 py-2">
              {allServices.length === 0 ? (
                <p className="px-4 py-2 text-sm text-slate-400">Hizmet bulunamadı</p>
              ) : allServices.map((svc) => (
                <button
                  key={svc}
                  onClick={() => {
                    setSelServices((prev) =>
                      prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc]
                    )
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <div className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                    selServices.includes(svc) ? "bg-blue-600 border-blue-600" : "border-slate-300"
                  )}>
                    {selServices.includes(svc) && <Check className="h-3 w-3 text-white" />}
                  </div>
                  {svc}
                </button>
              ))}
              {selServices.length > 0 && (
                <div className="border-t border-slate-100 mt-1 pt-1 px-3">
                  <button
                    onClick={() => setSelServices([])}
                    className="text-xs text-blue-600 hover:underline py-1"
                  >
                    Filtreyi temizle
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Paket ismi ya da hizmet ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <div className="ml-auto">
          <Link href="/hizmetler/paketler/yeni">
            <Button className="h-9 gap-1.5 text-sm">
              <Plus className="h-4 w-4" />
              Yeni Paket Oluştur
            </Button>
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Paket adı</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Hizmetler</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Kullanım süresi</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Paket ücreti</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-sm text-slate-400">
                    {search || selServices.length > 0 ? "Arama / filtre sonucu bulunamadı." : "Henüz paket eklenmemiş."}
                  </td>
                </tr>
              ) : filtered.map((pkg) => {
                const svcNames = pkg.package_services
                  .map((ps) => ps.services?.name)
                  .filter(Boolean)
                  .join(", ")
                return (
                  <tr
                    key={pkg.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-blue-50/40 cursor-pointer transition-colors"
                    onClick={() => router.push(`/hizmetler/paketler/${pkg.id}`)}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">{pkg.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{svcNames || "—"}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {PERIOD_LABELS[pkg.usage_period] || pkg.usage_period || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">
                      ₺{Number(pkg.price).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSatisPkg(pkg)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline whitespace-nowrap"
                      >
                        Satış yap +
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span />
            <span>Toplam kayıt: <span className="font-medium text-slate-600">{filtered.length}</span> adet</span>
          </div>
        </div>
      </div>

      {/* Satış Panel */}
      {satisPkg && (
        <SatisPanel
          pkg={satisPkg}
          customers={customers}
          companyId={companyId ?? null}
          onClose={() => setSatisPkg(null)}
          onSaved={fetchPackages}
          onSaleSuccess={(info) => {
            setSaleSuccess(info)
            setSaleDialogOpen(true)
          }}
        />
      )}

      <PackageSaleSuccessDialog
        open={saleDialogOpen}
        onOpenChange={setSaleDialogOpen}
        info={saleSuccess}
        onPlanLater={() => {
          setSaleDialogOpen(false)
          setSaleSuccess(null)
        }}
        onPlan={() => {
          if (!saleSuccess) return
          router.push(
            `/hizmetler/paketler/${saleSuccess.packageId}/paket-planla/${saleSuccess.customerPackageId}`
          )
          setSaleDialogOpen(false)
          setSaleSuccess(null)
        }}
      />
    </div>
  )
}
