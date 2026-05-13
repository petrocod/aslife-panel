"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Loader2, Plus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { supabaseData as supabase } from "@/lib/supabase-data"
import { DEMO_COMPANY_ID, useCompany } from "@/hooks/useCompany"
import { safeParseFilters, summarizeFilters, type TargetAudienceFilters } from "@/lib/target-audience"

type Audience = { id: string; name: string; filters: unknown; created_at: string; status?: "draft" | "active" | null }
type Customer = { id: string; full_name: string; phone: string; email: string | null; city: string | null; gender: string | null; sms_consent: boolean; created_at: string }
type Appointment = { customer_id: string; service_id: string | null; appointment_date: string }
type Payment = { customer_id: string; amount: number; paid_at: string | null; created_at: string }
type CustomerPackage = { customer_id: string; package_id: string | null }

export default function AudienceDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id
  const { companyId } = useCompany()
  const cid = companyId || DEMO_COMPANY_ID

  const [audience, setAudience] = useState<Audience | null>(null)
  const [filters, setFilters] = useState<TargetAudienceFilters>(safeParseFilters({}))
  const [customers, setCustomers] = useState<Customer[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [customerPackages, setCustomerPackages] = useState<CustomerPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [viewTab, setViewTab] = useState<"ozellikler" | "ozet">("ozellikler")
  const [statusSaving, setStatusSaving] = useState(false)
  const [statusInfo, setStatusInfo] = useState("")

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [{ data: aud }, { data: c }, { data: a }, { data: p }, { data: cp }] = await Promise.all([
      supabase.from("target_audiences").select("id,name,filters,created_at,status").eq("id", id).maybeSingle(),
      supabase.from("customers").select("id,full_name,phone,email,city,gender,sms_consent,created_at").eq("company_id", cid),
      supabase.from("appointments").select("customer_id,service_id,appointment_date").eq("company_id", cid),
      supabase.from("payments").select("customer_id,amount,paid_at,created_at").eq("company_id", cid),
      supabase.from("customer_packages").select("customer_id,package_id").eq("company_id", cid),
    ])
    if (aud) {
      setAudience(aud as Audience)
      setFilters(safeParseFilters(aud.filters))
    }
    setCustomers((c as Customer[]) || [])
    setAppointments((a as Appointment[]) || [])
    setPayments((p as Payment[]) || [])
    setCustomerPackages((cp as CustomerPackage[]) || [])
    setLoading(false)
  }, [cid, id])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const filteredCustomers = useMemo(() => {
    const start = filters.time?.startDate || ""
    const end = filters.time?.endDate || ""
    const inDateRange = (d: string) => (!start || d >= start) && (!end || d <= end)
    const selectedIds = new Set(filters.selectedCustomerIds || [])
    return customers.filter((customer) => {
      if (selectedIds.has(customer.id)) return true
      if (filters.location?.city && (customer.city || "").toLowerCase() !== filters.location.city.toLowerCase()) return false
      if (filters.customer?.gender && customer.gender !== filters.customer.gender) return false

      const custAppointments = appointments.filter((x) => x.customer_id === customer.id && inDateRange(x.appointment_date))
      if (filters.customer?.hasAppointments && custAppointments.length === 0) return false
      if (filters.customer?.noAppointments && custAppointments.length > 0) return false

      if ((filters.services?.serviceIds || []).length > 0) {
        const serviceOk = custAppointments.some((x) => x.service_id && (filters.services?.serviceIds || []).includes(x.service_id))
        if (!serviceOk) return false
      }
      if ((filters.services?.packageIds || []).length > 0) {
        const cp = customerPackages.filter((x) => x.customer_id === customer.id)
        const packageOk = cp.some((x) => x.package_id && (filters.services?.packageIds || []).includes(x.package_id))
        if (!packageOk) return false
      }

      const visitCount = custAppointments.length
      if (filters.visitFrequency?.min !== undefined && visitCount < filters.visitFrequency.min) return false
      if (filters.visitFrequency?.max !== undefined && visitCount > filters.visitFrequency.max) return false

      const custPayments = payments.filter((x) => {
        const dt = (x.paid_at || x.created_at || "").slice(0, 10)
        return x.customer_id === customer.id && inDateRange(dt)
      })
      const totalPaid = custPayments.reduce((sum, item) => sum + Number(item.amount || 0), 0)
      const po = filters.purchaseAmount?.operator
      if (po === "eq" && filters.purchaseAmount?.value !== undefined && totalPaid !== filters.purchaseAmount.value) return false
      if (po === "gt" && filters.purchaseAmount?.value !== undefined && totalPaid <= filters.purchaseAmount.value) return false
      if (po === "lt" && filters.purchaseAmount?.value !== undefined && totalPaid >= filters.purchaseAmount.value) return false
      if (po === "between") {
        if (filters.purchaseAmount?.min !== undefined && totalPaid < filters.purchaseAmount.min) return false
        if (filters.purchaseAmount?.max !== undefined && totalPaid > filters.purchaseAmount.max) return false
      }
      return true
    })
  }, [appointments, customerPackages, customers, filters, payments])

  const filteredSearch = useMemo(() => {
    return customers.filter(
      (c) =>
        c.full_name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search) ||
        (c.email || "").toLowerCase().includes(search.toLowerCase())
    )
  }, [customers, search])

  async function saveSelectedCustomers(selectedIds: string[]) {
    const nextFilters = { ...filters, selectedCustomerIds: selectedIds }
    await supabase.from("target_audiences").update({ filters: nextFilters }).eq("id", id)
    setFilters(nextFilters)
    setSheetOpen(false)
  }

  async function saveAudienceStatus(status: "draft" | "active") {
    setStatusSaving(true)
    setStatusInfo("")
    const withStatus = await supabase.from("target_audiences").update({ status }).eq("id", id)
    if (withStatus.error && String(withStatus.error.message || "").toLowerCase().includes("status")) {
      // status kolonu henüz yoksa sessizce geç (geriye uyumluluk)
      setStatusSaving(false)
      setStatusInfo("Kaydedildi.")
      router.push("/pazarlama/hedef-kitleler")
      return
    }
    setStatusSaving(false)
    if (!withStatus.error) {
      setStatusInfo(status === "draft" ? "Taslak kaydedildi." : "Aktif olarak kaydedildi.")
      router.push("/pazarlama/hedef-kitleler")
    }
  }

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
  if (!audience) return <div className="p-6 text-slate-500">Hedef kitle bulunamadı.</div>

  const summary = summarizeFilters(filters)
  const smsCount = filteredCustomers.filter((x) => x.sms_consent).length

  return (
    <div className="p-5 bg-slate-50/60 min-h-full">
      <div className="mb-3 text-xs text-slate-500">
        <Link href="/pazarlama/hedef-kitleler" className="hover:text-blue-600">Pazarlama</Link> / <span>{audience.name}</span>
      </div>
      <h1 className="text-xl font-semibold text-slate-800 mb-4">{audience.name}</h1>

      <div className="grid grid-cols-12 gap-4">
        <aside className="col-span-12 lg:col-span-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm">
            <h3 className="font-semibold text-slate-800">Liste Özeti</h3>
            {summary.length === 0 ? <p className="text-sm text-slate-500">Filtre yok.</p> : summary.map((s) => <p key={s} className="text-xs text-slate-600">{s}</p>)}
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-500">Toplam müşteri</p>
              <p className="text-2xl font-bold">{filteredCustomers.length}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">SMS izni olan</p>
              <p className="text-2xl font-bold">{smsCount}</p>
            </div>
            <Link href={`/pazarlama/hedef-kitleler/yeni?id=${id}`}><Button variant="outline" className="w-full">Filtreleri Düzenle</Button></Link>
          </div>
        </aside>

        <section className="col-span-12 lg:col-span-9">
          <div className="mb-3 flex items-center gap-4 text-sm">
            <button
              type="button"
              onClick={() => setViewTab("ozellikler")}
              className={`pb-1 border-b-2 ${
                viewTab === "ozellikler"
                  ? "border-blue-600 text-blue-700 font-medium"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Liste Özellikleri
            </button>
            <button
              type="button"
              onClick={() => setViewTab("ozet")}
              className={`pb-1 border-b-2 ${
                viewTab === "ozet"
                  ? "border-blue-600 text-blue-700 font-medium"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Liste Özeti
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            {viewTab === "ozet" ? (
              <div className="p-8">
                <h3 className="text-lg font-semibold text-slate-800 mb-3">Liste Özeti</h3>
                <div className="space-y-2">
                  {summary.length === 0 ? (
                    <p className="text-sm text-slate-500">Henüz filtre bulunmuyor.</p>
                  ) : (
                    summary.map((line) => (
                      <div key={line} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                        {line}
                      </div>
                    ))
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-5">
                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">Toplam müşteri</p>
                    <p className="text-2xl font-bold">{filteredCustomers.length}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">SMS izni olan</p>
                    <p className="text-2xl font-bold">{smsCount}</p>
                  </div>
                </div>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="py-20 text-center">
                <Users className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                <p className="text-xl text-slate-700 mb-1">Müşteri Bulunamadı</p>
                <p className="text-sm text-slate-500 mb-4">Kriterleri değiştirin veya manuel müşteri ekleyin.</p>
                <Button onClick={() => setSheetOpen(true)} className="gap-1"><Plus className="h-4 w-4" />Müşteri Ekle</Button>
              </div>
            ) : (
              <>
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left text-xs text-slate-500 font-semibold px-4 py-3">İsim</th>
                      <th className="text-left text-xs text-slate-500 font-semibold px-4 py-3">Telefon</th>
                      <th className="text-left text-xs text-slate-500 font-semibold px-4 py-3">e-Mail</th>
                      <th className="text-left text-xs text-slate-500 font-semibold px-4 py-3">Kayıt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((c) => (
                      <tr key={c.id} className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors">
                        <td className="px-4 py-3 text-sm">{c.full_name}</td>
                        <td className="px-4 py-3 text-sm">{c.phone}</td>
                        <td className="px-4 py-3 text-sm">{c.email || "-"}</td>
                        <td className="px-4 py-3 text-sm">{new Date(c.created_at).toLocaleDateString("tr-TR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-2.5 text-xs text-slate-500 bg-slate-50/40">Toplam kayıt: {filteredCustomers.length} adet</div>
              </>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Link href="/pazarlama/hedef-kitleler"><Button variant="outline">Vazgeç</Button></Link>
            {viewTab === "ozellikler" && (
              <Button variant="outline" onClick={() => setSheetOpen(true)}>Müşteri Ekle</Button>
            )}
            {statusInfo && <p className="mr-2 text-xs text-emerald-700 self-center">{statusInfo}</p>}
            <Button variant="outline" onClick={() => void saveAudienceStatus("active")} disabled={statusSaving}>
              {statusSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Kaydet
            </Button>
            <Button onClick={() => void saveAudienceStatus("draft")} disabled={statusSaving}>
              {statusSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Taslağı Kaydet
            </Button>
          </div>
        </section>
      </div>

      <AddCustomersSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        customers={filteredSearch}
        initialSelected={filters.selectedCustomerIds || []}
        onSave={saveSelectedCustomers}
        search={search}
        setSearch={setSearch}
      />
    </div>
  )
}

function AddCustomersSheet({
  open,
  onOpenChange,
  customers,
  initialSelected,
  onSave,
  search,
  setSearch,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  customers: Customer[]
  initialSelected: string[]
  onSave: (ids: string[]) => Promise<void>
  search: string
  setSearch: (v: string) => void
}) {
  const [selected, setSelected] = useState<string[]>(initialSelected)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setSelected(initialSelected)
  }, [initialSelected, open])

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function handleSave() {
    setSaving(true)
    await onSave(selected)
    setSaving(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Müşteri Ekle</SheetTitle>
        </SheetHeader>
        <div className="py-4 space-y-3">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ara" />
          <div className="max-h-[60vh] overflow-auto border rounded-md">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="w-8 px-2 py-2" />
                  <th className="text-left text-xs text-slate-500 px-2 py-2">İsim</th>
                  <th className="text-left text-xs text-slate-500 px-2 py-2">Telefon</th>
                  <th className="text-left text-xs text-slate-500 px-2 py-2">e-Mail</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100">
                    <td className="px-2 py-2"><input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} /></td>
                    <td className="px-2 py-2 text-sm">{c.full_name}</td>
                    <td className="px-2 py-2 text-sm">{c.phone}</td>
                    <td className="px-2 py-2 text-sm">{c.email || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Vazgeç</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Kaydet
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
