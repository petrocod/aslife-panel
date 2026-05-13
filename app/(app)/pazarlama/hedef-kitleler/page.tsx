"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { MoreVertical, Plus, Search, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabaseData as supabase } from "@/lib/supabase-data"
import { DEMO_COMPANY_ID, useCompany } from "@/hooks/useCompany"

type AudienceRow = {
  id: string
  name: string
  created_at: string
  filters: unknown
  status?: "draft" | "active" | null
}

export default function HedefKitlelerPage() {
  const { companyId } = useCompany()
  const cid = companyId || DEMO_COMPANY_ID
  const [rows, setRows] = useState<AudienceRow[]>([])
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(true)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const loadRows = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from("target_audiences")
      .select("id,name,filters,created_at,status")
      .eq("company_id", cid)
      .order("created_at", { ascending: false })
    setRows((data as AudienceRow[]) || [])
    setLoading(false)
  }, [cid])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  const filtered = useMemo(() => {
    return rows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()))
  }, [q, rows])

  async function removeAudience(id: string) {
    await supabase.from("target_audiences").delete().eq("id", id)
    setOpenMenuId(null)
    loadRows()
  }

  return (
    <div className="p-6 bg-slate-50/60 min-h-full">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-slate-800">Hedef Kitleler</h1>
        <p className="text-sm text-slate-500 mt-1">
          Kampanyalarınız için filtreli müşteri listeleri oluşturup yönetin.
        </p>
      </div>
      <div className="flex items-center justify-between mb-5">
        <Tabs defaultValue="hedef">
          <TabsList className="bg-transparent border-b border-slate-200 rounded-none h-auto p-0 gap-4">
            <TabsTrigger value="hedef" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 pb-3">🎯 Hedef Kitleler</TabsTrigger>
            <Link href="/pazarlama/kampanyalar"><TabsTrigger value="kampanya" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 pb-3">📢 Kampanyalar</TabsTrigger></Link>
          </TabsList>
        </Tabs>

        <div className="text-xs text-orange-500 font-medium flex items-center gap-1 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-lg">
          <span>⚠</span>
          Netgsm Entegrasyonu Gerekmektedir
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
        <div className="p-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/60">
          <div className="relative flex-1 max-w-sm">
            <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hedef kitle ara" className="pl-8 h-9" />
          </div>
          <Link href="/pazarlama/hedef-kitleler/yeni">
            <Button size="sm" className="gap-1"><Plus className="h-4 w-4" />Hedef Kitle Oluştur</Button>
          </Link>
        </div>

        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Hedef Kitle Adı</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Kayıt Tarihi</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Durumu</th>
              <th className="w-12" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="py-12 text-center text-sm text-slate-500">Yükleniyor...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="py-12 text-center text-sm text-slate-500">Henüz bir hedef kitleniz yok.</td></tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium">
                    <Link href={`/pazarlama/hedef-kitleler/${row.id}`} className="hover:text-blue-600">{row.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{new Date(row.created_at).toLocaleDateString("tr-TR")}</td>
                  <td className="px-4 py-3">
                    {row.status === "draft" ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700">Taslak</span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">Aktif</span>
                    )}
                  </td>
                  <td className="px-2 py-2 relative">
                    <button className="h-8 w-8 rounded-md hover:bg-slate-100 inline-flex items-center justify-center" onClick={() => setOpenMenuId((v) => (v === row.id ? null : row.id))}><MoreVertical className="h-4 w-4 text-slate-500" /></button>
                    {openMenuId === row.id && (
                      <div className="absolute right-2 top-10 z-20 bg-white border border-slate-200 rounded-lg shadow-md overflow-hidden min-w-32">
                        <Link href={`/pazarlama/hedef-kitleler/yeni?id=${row.id}`} className="block px-3 py-2 text-sm hover:bg-slate-50">Düzenle</Link>
                        <button onClick={() => removeAudience(row.id)} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 inline-flex items-center gap-1"><Trash2 className="h-3.5 w-3.5" />Sil</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="px-4 py-2.5 text-xs text-slate-500 border-t border-slate-100 bg-slate-50/40">Toplam kayıt: {filtered.length} adet</div>
      </div>
    </div>
  )
}
