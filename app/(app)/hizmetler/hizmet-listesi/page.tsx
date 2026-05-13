"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Search, Filter, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabaseData as supabase } from "@/lib/supabase-data"

type Service = {
  id: string
  name: string
  duration_hours: number
  duration_minutes: number
  price: number
  service_locations: { name: string } | null
  employees: { full_name: string } | null
}

export default function HizmetListesiPage() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchServices = useCallback(async () => {
    setLoading(true)
    const { data, error: sbError } = await supabase
      .from("services")
      .select("id, name, duration_hours, duration_minutes, price, service_locations(name), employees(full_name)")
      .order("created_at", { ascending: false })

    if (sbError) {
      setError(sbError.message)
    } else {
      setServices((data as unknown as Service[]) || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchServices() }, [fetchServices])

  const filtered = services.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  function formatDuration(hours: number, minutes: number) {
    if (hours > 0 && minutes > 0) return `${hours} Saat ${minutes} Dakika`
    if (hours > 0) return `${hours} Saat`
    return `${minutes} Dakika`
  }

  function formatPrice(price: number) {
    return `₺${price.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="outline" size="sm" className="text-xs gap-1">
          <Filter className="h-3.5 w-3.5" />
          Hizmet Yerleri
        </Button>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Hizmet Ara"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Link href="/hizmetler/hizmet-listesi/yeni">
          <Button className="gap-1">
            <Plus className="h-4 w-4" />
            Hizmet oluştur
          </Button>
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Hizmet adı</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Hizmet yeri</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Atananlar</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Ort. hizmet süresi</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500">Ücret</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                  {search ? "Arama sonucu bulunamadı." : "Henüz hizmet eklenmemiş."}
                </td>
              </tr>
            ) : (
              filtered.map((service) => (
                <tr
                  key={service.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer"
                  onClick={() => router.push(`/hizmetler/hizmet-listesi/${service.id}`)}
                >
                  <td className="px-6 py-4 text-sm font-medium text-slate-800">{service.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{service.service_locations?.name || "-"}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{service.employees?.full_name || "-"}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{formatDuration(service.duration_hours, service.duration_minutes)}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 text-right">{formatPrice(service.price)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="px-6 py-3 border-t border-slate-100 text-xs text-slate-500">
          Toplam kayıt: {filtered.length} adet
        </div>
      </div>
    </div>
  )
}
