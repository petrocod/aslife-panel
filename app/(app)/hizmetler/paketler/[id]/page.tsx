"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import {
  Loader2, ChevronDown, ChevronRight, Plus, Users, CreditCard, BadgeDollarSign, Wallet,
  Tag, Clock, Layers, FileText, Edit2, Trash2, X, Search, Settings,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { supabaseData as supabase } from "@/lib/supabase-data"
import { useCompany, DEMO_COMPANY_ID } from "@/hooks/useCompany"
import { recordIncomeFromPackageSale } from "@/lib/finance/integration"
import { DateInput } from "@/components/shared/DateInput"
import {
  PackageSaleSuccessDialog,
  type PackageSaleSuccessInfo,
} from "@/components/paketler/PackageSaleSuccessDialog"

// ── Types ────────────────────────────────────────────────────────────────────
type PackageService = {
  id: string
  sessions: number
  services: { name: string; price: number; duration_hours: number; duration_minutes: number } | null
}
type PaketDetail = {
  id: string; name: string; usage_period: string; price: number; description: string | null
  package_services: PackageService[]
}
type CustomerPkg = {
  id: string; customer_id: string; start_date: string; end_date: string | null; status: string
  total_price: number; total_paid: number
  customers: { full_name: string; phone: string } | null
}
type Customer = { id: string; full_name: string }

const PERIOD_LABELS: Record<string, string> = {
  none: "Kullanım süresi yok", "1_month": "1 Ay",
  "3_months": "3 Ay", "6_months": "6 Ay", "1_year": "1 Yıl",
}
const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
}
const STATUS_LABELS: Record<string, string> = {
  active: "Aktif", completed: "Tamamlandı", cancelled: "İptal edildi",
}

const fmt = (d: string) => { try { return format(parseISO(d), "dd.MM.yyyy") } catch { return d } }

// ── Satış Panel ───────────────────────────────────────────────────────────────
function SatisPanel({
  pkg, customers, companyId, onClose, onSaved, onSaleSuccess,
}: {
  pkg: PaketDetail; customers: Customer[]
  companyId: string | null; onClose: () => void; onSaved: () => void
  onSaleSuccess?: (info: PackageSaleSuccessInfo) => void
}) {
  const today = format(new Date(), "yyyy-MM-dd")
  const [customerId,   setCustomerId]   = useState("")
  const [saleDate,     setSaleDate]     = useState(today)
  const [startDate,    setStartDate]    = useState(today)
  const [endDate,      setEndDate]      = useState(today)
  const [fee,          setFee]          = useState(String(pkg.price))
  const [lastPayDate,  setLastPayDate]  = useState("")
  const [discountVal,  setDiscountVal]  = useState("0")
  const [discountType, setDiscountType] = useState<"amount" | "percent">("amount")
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState("")

  const base     = Number(fee) || 0
  const discount = discountType === "percent" ? (base * (Number(discountVal) || 0)) / 100 : (Number(discountVal) || 0)
  const total    = Math.max(0, base - discount)

  async function handleSave() {
    if (!customerId) { setError("Müşteri seçiniz."); return }
    setError(""); setSaving(true)
    const effectiveCompanyId = companyId || DEMO_COMPANY_ID
    const { data: row, error: e } = await supabase.from("customer_packages").insert({
      company_id: effectiveCompanyId,
      customer_id: customerId, package_id: pkg.id,
      start_date: startDate, end_date: endDate || null,
      status: "active", total_price: total, total_paid: 0,
    }).select("id").single()
    setSaving(false)
    if (e) { setError(e.message); return }
    if (row?.id) {
      const { error: finErr } = await recordIncomeFromPackageSale(supabase, {
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
    onSaved(); onClose()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-[420px] bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-200 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-800">{pkg.name} – Paket satışı</h2>
            <p className="text-xs text-slate-500 mt-0.5">Paket satışı sonrasında paketi planlamayı unutma</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 mt-0.5">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Müşteri adı *</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="Müşterinizi seçin" /></SelectTrigger>
              <SelectContent>
                {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Paket satış tarihi *</Label>
            <DateInput value={saleDate} onChange={setSaleDate} />
          </div>
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
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Paket ücreti</Label>
            <div className="flex items-center border border-slate-200 rounded-md h-9 px-3 bg-white focus-within:ring-2 focus-within:ring-blue-500">
              <span className="text-slate-400 text-sm mr-1">₺</span>
              <input type="number" min="0" step="0.01" value={fee} onChange={(e) => setFee(e.target.value)}
                className="flex-1 text-sm outline-none bg-transparent" placeholder="0.00" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Son ödeme tarihi</Label>
            <DateInput value={lastPayDate} onChange={setLastPayDate} />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">İndirim tutarı</Label>
            <div className="flex items-center border border-slate-200 rounded-md h-9 overflow-hidden bg-white focus-within:ring-2 focus-within:ring-blue-500">
              <span className="text-slate-400 text-sm ml-3 mr-1">₺</span>
              <input type="number" min="0" step="0.01" value={discountVal} onChange={(e) => setDiscountVal(e.target.value)}
                className="flex-1 text-sm outline-none bg-transparent" placeholder="0.00" />
              <div className="flex shrink-0 border-l border-slate-200 divide-x divide-slate-200 h-full">
                {(["amount", "percent"] as const).map((t) => (
                  <button key={t} onClick={() => setDiscountType(t)}
                    className={cn("px-2.5 text-sm font-medium h-full transition-colors",
                      discountType === t ? "bg-slate-800 text-white" : "bg-white text-slate-500 hover:bg-slate-50"
                    )}>
                    {t === "amount" ? "₺" : "%"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">İndirim</span>
              <span className="font-medium text-slate-700">{discount > 0 ? `-₺${discount.toFixed(2)}` : "₺0,00"}</span>
            </div>
            <div className="flex items-center justify-between text-sm border-t border-slate-200 pt-2">
              <span className="font-semibold text-slate-700">Toplam paket ücreti</span>
              <span className="font-bold text-slate-800 text-base">₺{total.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-200 shrink-0">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Vazgeç</Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Kaydet
          </Button>
        </div>
      </div>
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PaketDetailPage() {
  const router = useRouter()
  const params = useParams()
  const pkgId  = params.id as string
  const { companyId } = useCompany()
  const cid = companyId || DEMO_COMPANY_ID

  const [pkg,         setPkg]         = useState<PaketDetail | null>(null)
  const [sales,       setSales]       = useState<CustomerPkg[]>([])
  const [customers,   setCustomers]   = useState<Customer[]>([])
  const [loading,     setLoading]     = useState(true)
  const [tab,         setTab]         = useState<"bilgiler" | "durumlar">("bilgiler")
  const [showSatis,   setShowSatis]   = useState(false)
  const [saleSuccess, setSaleSuccess] = useState<PackageSaleSuccessInfo | null>(null)
  const [saleDialogOpen, setSaleDialogOpen] = useState(false)
  const [showMenu,    setShowMenu]    = useState(false)
  const [showDelete,  setShowDelete]  = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [salesSearch, setSalesSearch] = useState("")

  const fetchPkg = useCallback(async () => {
    const { data } = await supabase.from("packages")
      .select("id, name, usage_period, price, description, package_services(id, sessions, services(name, price, duration_hours, duration_minutes))")
      .eq("id", pkgId)
      .eq("company_id", cid)
      .single()
    setPkg(data as unknown as PaketDetail)
    setLoading(false)
  }, [pkgId, cid])

  const fetchSales = useCallback(async () => {
    const { data } = await supabase.from("customer_packages")
      .select("id, customer_id, start_date, end_date, status, total_price, total_paid, customers(full_name, phone)")
      .eq("package_id", pkgId)
      .eq("company_id", cid)
      .order("created_at", { ascending: false })
    setSales((data as unknown as CustomerPkg[]) || [])
  }, [pkgId, cid])

  useEffect(() => {
    fetchPkg()
    fetchSales()
    supabase.from("customers").select("id, full_name").eq("company_id", cid).order("full_name")
      .then(({ data }) => setCustomers((data as Customer[]) || []))
  }, [fetchPkg, fetchSales, cid])

  async function handleDelete() {
    setDeleting(true)
    await supabase.from("packages").delete().eq("id", pkgId).eq("company_id", cid)
    setDeleting(false)
    router.push("/hizmetler/paketler")
    router.refresh()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  )
  if (!pkg) return <div className="p-6 text-slate-500">Paket bulunamadı.</div>

  const totalMusteri  = new Set(sales.map((s) => s.customers?.full_name).filter(Boolean)).size
  const totalSatis    = sales.reduce((sum, s) => sum + s.total_price, 0)
  const totalOdeme    = sales.reduce((sum, s) => sum + s.total_paid, 0)
  const kalanBakiye   = totalSatis - totalOdeme

  const svcSummary = pkg.package_services
    .map((ps) => `${ps.services?.name || "?"}, ${ps.sessions} Seans`)
    .join(" · ")

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-200 px-6 pt-4 pb-0 shrink-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-xs text-slate-400 mb-3">
          <Link href="/hizmetler/paketler" className="hover:text-blue-600 transition-colors">Paketler</Link>
          <span>/</span>
          <span className="text-slate-600 font-medium">{pkg.name}</span>
        </div>

        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-800">{pkg.name}</h1>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Layers className="h-3.5 w-3.5" />
                {pkg.package_services.map((ps) => ps.services?.name).filter(Boolean).join(", ") || "—"}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {PERIOD_LABELS[pkg.usage_period] || pkg.usage_period}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Button variant="outline" size="sm" className="gap-1.5 text-sm"
                onClick={() => setShowMenu((v) => !v)}>
                Diğer işlemler <ChevronDown className="h-3.5 w-3.5" />
              </Button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1">
                    <button
                      onClick={() => { setShowMenu(false); router.push(`/hizmetler/paketler/${pkgId}/duzenle`) }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Edit2 className="h-4 w-4 text-slate-400" /> Paketi düzenle
                    </button>
                    <button
                      onClick={() => { setShowMenu(false); setShowDelete(true) }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" /> Paketi sil
                    </button>
                  </div>
                </>
              )}
            </div>
            <Button size="sm" className="gap-1.5 text-sm" onClick={() => setShowSatis(true)}>
              <Plus className="h-4 w-4" /> Satış yap
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-3 mb-4">
          {[
            { icon: Users,             label: "Toplam müşteri adedi", value: totalMusteri },
            { icon: CreditCard,        label: "Toplam paket satışı",  value: `₺${totalSatis.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` },
            { icon: BadgeDollarSign,   label: "Yapılan ödeme",        value: `₺${totalOdeme.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` },
            { icon: Wallet,            label: "Kalan bakiye",         value: `₺${kalanBakiye.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 min-w-[140px]">
              <p className="text-xl font-bold text-slate-800">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-slate-200">
          {([
            { id: "bilgiler",  label: "Paket bilgileri" },
            { id: "durumlar",  label: "Paket durumları" },
          ] as const).map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn(
                "px-5 py-3 text-sm font-medium border-b-2 transition-colors",
                tab === t.id ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
              )}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 overflow-auto p-6">

        {/* Paket bilgileri */}
        {tab === "bilgiler" && (
          <div className="max-w-3xl">
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {[
                { icon: Tag,      label: "Paket adı",          value: pkg.name },
                { icon: Layers,   label: "Hizmet ve seanslar", value: svcSummary || "—" },
                { icon: Clock,    label: "Kullanım süresi",    value: PERIOD_LABELS[pkg.usage_period] || pkg.usage_period },
                { icon: CreditCard, label: "Paket ücreti",    value: `₺${Number(pkg.price).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` },
                { icon: FileText, label: "Paket açıklaması",   value: pkg.description || "—" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center px-6 py-4 hover:bg-slate-50">
                  <div className="w-52 flex items-center gap-2 text-sm text-slate-500 shrink-0">
                    <Icon className="h-4 w-4" /> {label}
                  </div>
                  <span className="text-sm text-slate-800">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" size="sm" className="gap-1.5"
                onClick={() => router.push(`/hizmetler/paketler/${pkgId}/duzenle`)}>
                <Edit2 className="h-4 w-4" /> Düzenle
              </Button>
            </div>
          </div>
        )}

        {/* Paket durumları */}
        {tab === "durumlar" && (
          <div>
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                placeholder="Müşteri adı ile ara"
                value={salesSearch}
                onChange={(e) => setSalesSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {["Müşteri adı", "Başlangıç tarihi", "Bitiş tarihi", "Seans", "Paket durumu", ""].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sales.filter((s) => !salesSearch || (s.customers?.full_name || "").toLowerCase().includes(salesSearch.toLowerCase())).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-sm text-slate-400">
                        {salesSearch ? "Arama sonucu bulunamadı." : "Henüz paket satışı yapılmamış."}
                      </td>
                    </tr>
                  ) : sales
                    .filter((s) => !salesSearch || (s.customers?.full_name || "").toLowerCase().includes(salesSearch.toLowerCase()))
                    .map((s) => {
                      const totalSessions = pkg.package_services.reduce((sum, ps) => sum + (ps.sessions || 0), 0)
                      return (
                        <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/30 transition-colors">
                          <td className="px-5 py-3.5 text-sm font-medium text-slate-800">
                            {s.customers?.full_name || "—"}
                          </td>
                          <td className="px-5 py-3.5 text-sm text-slate-600">{fmt(s.start_date)}</td>
                          <td className="px-5 py-3.5 text-sm text-slate-600">{s.end_date ? fmt(s.end_date) : "—"}</td>
                          <td className="px-5 py-3.5 text-sm font-medium text-slate-700">
                            —/{totalSessions}
                          </td>
                          <td className="px-5 py-3.5">
                            <button
                              onClick={() => router.push(`/musteriler/${s.customer_id}/paket/${s.id}`)}
                              className={cn(
                                "text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 w-fit transition-colors hover:opacity-80",
                                STATUS_COLORS[s.status] || "bg-slate-100 text-slate-600"
                              )}
                            >
                              {STATUS_LABELS[s.status] || s.status}
                              <ChevronRight className="h-3 w-3" />
                            </button>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={() => router.push(`/musteriler/${s.customer_id}/paket/${s.id}`)}
                              className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 ml-auto"
                            >
                              Yönet <Settings className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  }
                </tbody>
              </table>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span />
                <span>Toplam kayıt: <span className="font-medium text-slate-600">{sales.length}</span> adet</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Satış Panel */}
      {showSatis && (
        <SatisPanel
          pkg={pkg}
          customers={customers}
          companyId={companyId ?? null}
          onClose={() => setShowSatis(false)}
          onSaved={fetchSales}
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

      {/* Delete confirm */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="max-w-sm">
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
              <Trash2 className="h-7 w-7 text-red-600" />
            </div>
            <div className="text-center">
              <h2 className="text-base font-semibold text-slate-800">Paketi sil</h2>
              <p className="text-sm text-slate-500 mt-1">
                <span className="font-medium text-slate-700">{pkg.name}</span> paketi
                kalıcı olarak silinecek. Bu işlem geri alınamaz.
              </p>
            </div>
            <div className="flex gap-3 w-full">
              <Button variant="outline" className="flex-1" onClick={() => setShowDelete(false)} disabled={deleting}>
                Vazgeç
              </Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleDelete} disabled={deleting}>
                {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Evet, Sil
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
