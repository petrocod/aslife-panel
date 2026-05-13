"use client"

import { useEffect, useState } from "react"
import { supabaseData as supabase } from "@/lib/supabase-data"
import { Loader2 } from "lucide-react"
import { useCompany } from "@/hooks/useCompany"
import { format } from "date-fns"
import { tr } from "date-fns/locale"

type Payment = {
  id: string
  amount: number
  method: string
  paid_at: string
  notes: string | null
  customers: { full_name: string } | null
}

const methodLabel: Record<string, string> = {
  cash: "Nakit",
  card: "Kredi Kartı",
  transfer: "Havale",
  other: "Diğer",
}

export default function GecmisOdemelerPage() {
  const { companyId } = useCompany()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!companyId) return
    supabase
      .from("payments")
      .select("id, amount, method, paid_at, notes, customers(full_name)")
      .eq("company_id", companyId)
      .order("paid_at", { ascending: false })
      .then(({ data }) => {
        setPayments((data as unknown as Payment[]) || [])
        setLoading(false)
      })
  }, [companyId])

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Müşteri</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Tarih</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500">Yöntem</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500">Tutar</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                </td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-500">
                  Henüz geçmiş ödeme bulunmuyor.
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm text-slate-800">{p.customers?.full_name || "-"}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {p.paid_at ? format(new Date(p.paid_at), "dd MMM yyyy", { locale: tr }) : "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{methodLabel[p.method] || p.method}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-800 text-right">
                    ₺{Number(p.amount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="px-6 py-3 border-t border-slate-100 text-xs text-slate-500">
          Toplam kayıt: {payments.length} adet
        </div>
      </div>
    </div>
  )
}
