"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Search, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabaseData as supabase } from "@/lib/supabase-data"
import { useCompany, DEMO_COMPANY_ID } from "@/hooks/useCompany"

type Customer = {
  id: string
  full_name: string
  phone: string
  email: string | null
  created_at: string
}

export default function MusterilerPage() {
  const router = useRouter()
  const { companyId } = useCompany()
  const cid = companyId || DEMO_COMPANY_ID
  const [search, setSearch] = useState("")
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    const { data, error: sbError } = await supabase
      .from("customers")
      .select("id, full_name, phone, email, created_at")
      .eq("company_id", cid)
      .order("created_at", { ascending: false })

    if (sbError) {
      setError(sbError.message)
    } else {
      setCustomers(data || [])
    }
    setLoading(false)
  }, [cid])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  const filtered = customers.filter(
    (c) =>
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  )

  function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    return `${d.getDate().toString().padStart(2,"0")}.${(d.getMonth()+1).toString().padStart(2,"0")}.${d.getFullYear()}`
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Müşteri Ara"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Link href="/musteriler/yeni">
          <Button className="gap-1">
            <Plus className="h-4 w-4" />
            Yeni Müşteri
          </Button>
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ad Soyad</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Telefon numarası</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">e-Mail</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Kayıt Tarihi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-500 text-sm">
                  {search ? "Arama sonucu bulunamadı." : "Henüz müşteri eklenmemiş."}
                </td>
              </tr>
            ) : (
              filtered.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/musteriler/${customer.id}`)}
                >
                  <td className="px-6 py-4 text-sm font-medium text-slate-800">{customer.full_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{customer.phone}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{customer.email || "-"}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{formatDate(customer.created_at)}</td>
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
