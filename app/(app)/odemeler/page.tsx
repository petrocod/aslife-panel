"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, Filter, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { supabaseData as supabase } from "@/lib/supabase-data"
import { useCompany } from "@/hooks/useCompany"

type CustomerPayment = {
  id: string
  full_name: string
  total: number
  paid: number
  balance: number
}

type PackagePayment = {
  id: string
  name: string
  customers: number
  total: number
  paid: number
  balance: number
}

function fmt(n: number) {
  return `₺${n.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`
}

const TAB_KEYS = ["musteriler", "paketler", "siniflar", "krediler"] as const

export default function OdemelerPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-sm text-slate-500">Yükleniyor…</div>}>
      <OdemelerPageInner />
    </Suspense>
  )
}

function OdemelerPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawTab = searchParams.get("tab")
  const activeTab =
    rawTab != null && (TAB_KEYS as readonly string[]).includes(rawTab) ? rawTab : "musteriler"

  const { companyId } = useCompany()
  const [search, setSearch] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(true)
  const [customerPayments, setCustomerPayments] = useState<CustomerPayment[]>([])
  const [packagePayments, setPackagePayments] = useState<PackagePayment[]>([])

  const fetchData = useCallback(async () => {
    if (!companyId) return
    setLoading(true)

    const [{ data: appts }, { data: pays }, { data: custs }, { data: pkgs }] = await Promise.all([
      supabase
        .from("appointments")
        .select("id, customer_id, price, discount")
        .eq("company_id", companyId),
      supabase
        .from("payments")
        .select("customer_id, amount, appointment_id, notes")
        .eq("company_id", companyId),
      supabase
        .from("customers")
        .select("id, full_name")
        .eq("company_id", companyId),
      supabase
        .from("packages")
        .select("id, name")
        .eq("company_id", companyId),
    ])

    // Build customer payment summary (randevu satışı + paket satışı → total; tüm ödemeler → paid)
    const custMap: Record<string, CustomerPayment> = {}
    ;(custs || []).forEach((c) => {
      custMap[c.id] = { id: c.id, full_name: c.full_name, total: 0, paid: 0, balance: 0 }
    })
    ;(appts || []).forEach((a) => {
      if (a.customer_id && custMap[a.customer_id]) {
        const net = (Number(a.price) || 0) - (Number(a.discount) || 0)
        custMap[a.customer_id].total += net
      }
    })
    ;(pays || []).forEach((p) => {
      if (!p.customer_id || !custMap[p.customer_id]) return
      const amt = Number(p.amount) || 0
      custMap[p.customer_id].paid += amt
      if (!p.appointment_id && /Paket satışı/i.test(p.notes || "")) {
        custMap[p.customer_id].total += amt
      }
    })
    Object.values(custMap).forEach((c) => {
      c.balance = c.total - c.paid
    })
    const custList = Object.values(custMap).filter((c) => c.total > 0 || c.paid > 0)
    setCustomerPayments(custList)

    // Paket satışları: randevusuz ödemelerde notlar paket adını içerir
    const payments = pays || []
    const pkgList: PackagePayment[] = (pkgs || []).map((pkg) => {
      let total = 0
      for (const p of payments) {
        if (p.appointment_id) continue
        const notes = p.notes || ""
        if (!/Paket satışı/i.test(notes)) continue
        if (!notes.includes(pkg.name)) continue
        total += Number(p.amount) || 0
      }
      return {
        id: pkg.id,
        name: pkg.name,
        customers: 0,
        total,
        paid: total,
        balance: 0,
      }
    }).filter((p) => p.total > 0)
    setPackagePayments(pkgList.sort((a, b) => a.name.localeCompare(b.name, "tr")))

    setLoading(false)
  }, [companyId])

  useEffect(() => { fetchData() }, [fetchData])

  const filteredCustomers = customerPayments.filter((p) =>
    p.full_name.toLowerCase().includes(search.toLowerCase())
  )
  const filteredPackages = packagePayments.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  function setMainTab(tab: string) {
    router.replace(`/odemeler?tab=${encodeURIComponent(tab)}`, { scroll: false })
  }

  return (
    <div className="p-6">
      <Tabs value={activeTab} onValueChange={setMainTab}>
        <div className="flex items-center gap-3 mb-4">
          <TabsList className="bg-transparent border-b-0 h-auto p-0 gap-1">
            <TabsTrigger value="musteriler" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 rounded-md px-3 py-1.5 text-sm flex items-center gap-1.5">
              <span className="text-slate-400">👤</span> Müşteriler
            </TabsTrigger>
            <TabsTrigger value="paketler" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 rounded-md px-3 py-1.5 text-sm flex items-center gap-1.5">
              <span className="text-slate-400">📦</span> Paketler
            </TabsTrigger>
            <TabsTrigger value="siniflar" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 rounded-md px-3 py-1.5 text-sm flex items-center gap-1.5">
              <span className="text-slate-400">🎓</span> Sınıflar
            </TabsTrigger>
            <TabsTrigger value="krediler" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 rounded-md px-3 py-1.5 text-sm flex items-center gap-1.5">
              <span className="text-slate-400">💳</span> Krediler
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Ödeme Ara"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-8 w-48"
              />
            </div>
          </div>
        </div>

        <TabsContent value="musteriler">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Adı Soyadı</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Satış Tutarı</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Yapılan Ödeme</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Kalan Bakiye</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-500">
                      {search ? "Arama sonucu bulunamadı." : "Henüz ödeme kaydı bulunmuyor."}
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((p) => (
                    <tr
                      key={p.id}
                      role="link"
                      tabIndex={0}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/odemeler/musteriler/${p.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          router.push(`/odemeler/musteriler/${p.id}`)
                        }
                      }}
                    >
                      <td className="px-6 py-4 text-sm font-medium">
                        <span className="text-blue-700">{p.full_name}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{fmt(p.total)}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{fmt(p.paid)}</td>
                      <td className={`px-6 py-4 text-sm font-medium ${p.balance > 0 ? "text-red-500" : "text-green-600"}`}>
                        {fmt(p.balance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="px-6 py-3 border-t border-slate-100 text-xs text-slate-500">
              Toplam kayıt: {filteredCustomers.length} adet
            </div>
          </div>
        </TabsContent>

        <TabsContent value="paketler">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Paket Adı</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Satış Tutarı</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={2} className="px-6 py-12 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                    </td>
                  </tr>
                ) : filteredPackages.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-6 py-12 text-center text-sm text-slate-500">
                      {search ? "Arama sonucu bulunamadı." : "Henüz paket ödemesi bulunmuyor."}
                    </td>
                  </tr>
                ) : (
                  filteredPackages.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-800">{p.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{fmt(p.total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="px-6 py-3 border-t border-slate-100 text-xs text-slate-500">
              Toplam kayıt: {filteredPackages.length} adet
            </div>
          </div>
        </TabsContent>

        <TabsContent value="siniflar">
          <div className="text-center py-12 text-slate-500 text-sm">Henüz sınıf ödemesi bulunmuyor</div>
        </TabsContent>

        <TabsContent value="krediler">
          <div className="text-center py-12 text-slate-500 text-sm">Henüz kredi işlemi bulunmuyor</div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
