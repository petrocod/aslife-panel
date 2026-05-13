"use client"

export const dynamic = "force-dynamic"

import { Suspense, useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Plus, Search, Loader2, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { supabaseData as supabase } from "@/lib/supabase-data"
import { useCompany, DEMO_COMPANY_ID } from "@/hooks/useCompany"
import { useSubscription } from "@/hooks/useSubscription"
import { CalismaSaatleriPanel } from "@/components/ayarlar/CalismaSaatleriPanel"
import { PrimlerPanel } from "@/components/ayarlar/PrimlerPanel"
import { canAddEmployees } from "@/lib/subscription"

type Employee = {
  id: string
  full_name: string
  phone: string
  email: string
  status: string
}

function CalisanlarContent() {
  const router = useRouter()
  const { companyId } = useCompany()
  const cid = companyId || DEMO_COMPANY_ID
  const sub = useSubscription()
  const searchParams = useSearchParams()
  const defaultTab = useMemo(() => {
    const t = searchParams.get("tab")
    if (t === "primler") return "primler"
    if (t === "saatler") return "saatler"
    return "calisanlar"
  }, [searchParams])
  const [search, setSearch] = useState("")
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  const staffLimitReached = useMemo(() => {
    if (!companyId || companyId === DEMO_COMPANY_ID || sub.loading) return false
    return !canAddEmployees(employees.length, sub.maxUsers)
  }, [companyId, sub.loading, sub.maxUsers, employees.length])

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from("employees")
      .select("id, full_name, phone, email, status")
      .eq("company_id", cid)
      .order("created_at", { ascending: false })
    setEmployees(data || [])
    setLoading(false)
  }, [cid])

  useEffect(() => { fetchEmployees() }, [fetchEmployees])

  const filtered = employees.filter(
    (e) =>
      e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      e.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6">
      <Tabs key={defaultTab} defaultValue={defaultTab}>
        <TabsList className="bg-transparent border-b border-slate-200 rounded-none h-auto p-0 mb-4">
          <TabsTrigger value="calisanlar" asChild className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 pb-3 mr-4">
            <Link href="/ayarlar/calisanlar">Çalışanlar</Link>
          </TabsTrigger>
          <TabsTrigger value="saatler" asChild className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 pb-3 mr-4">
            <Link href="/ayarlar/calisanlar?tab=saatler" className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 opacity-80" />
              Çalışma Saatleri
            </Link>
          </TabsTrigger>
          <TabsTrigger value="primler" asChild className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 pb-3 flex items-center gap-1">
            <Link href="/ayarlar/calisanlar?tab=primler" className="inline-flex items-center gap-1">
              Primler
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800 border-0">Yeni</Badge>
            </Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calisanlar">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Çalışan Ara" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {staffLimitReached ? (
              <Link href="/hesabim/plan-sec">
                <Button variant="outline" className="gap-1 border-amber-300 text-amber-900 hover:bg-amber-50">
                  <Plus className="h-4 w-4" />
                  Limit doldu — plan yükselt
                </Button>
              </Link>
            ) : (
              <Link href="/ayarlar/calisanlar/yeni">
                <Button className="gap-1">
                  <Plus className="h-4 w-4" />
                  Çalışan ekle
                </Button>
              </Link>
            )}
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Ad Soyad</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Telefon numarası</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">e-Mail</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Durum</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-sm text-slate-500">
                      {search ? "Arama sonucu bulunamadı." : "Henüz çalışan eklenmemiş."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((emp) => (
                    <tr key={emp.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer" onClick={() => router.push(`/ayarlar/calisanlar/${emp.id}`)}>
                      <td className="px-6 py-4 text-sm font-medium text-slate-800">{emp.full_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{emp.phone}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{emp.email}</td>
                      <td className="px-6 py-4">
                        <Badge variant={emp.status === "active" ? "default" : "secondary"} className="text-xs">
                          {emp.status === "active" ? "Aktif" : "Pasif"}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="px-6 py-3 border-t border-slate-100 text-xs text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>Toplam kayıt: {filtered.length} adet</span>
              {companyId && companyId !== DEMO_COMPANY_ID && !sub.loading && (
                <span className="text-slate-600">
                  Plan: <strong>{sub.planName}</strong> — çalışan kotası:{" "}
                  <strong>
                    {employees.length} / {Math.max(0, sub.maxUsers - 1)}
                  </strong>
                </span>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="saatler">
          <CalismaSaatleriPanel />
        </TabsContent>

        <TabsContent value="primler">
          <PrimlerPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function CalisanlarPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <CalisanlarContent />
    </Suspense>
  )
}
