"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase-client"
import { DollarSign, TrendingUp } from "lucide-react"

type Payment = { id: string; amount: number; plan_id: string; status: string; created_at: string; company_id: string }

export default function AdminRevenuePage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("subscription_payments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100)
      setPayments(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const totalRevenue = payments.filter(p => p.status === "completed").reduce((s, p) => s + (p.amount || 0), 0)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Gelir & Ödemeler</h1>
        <p className="text-sm text-slate-500 mt-1">Abonelik ödemelerini takip edin</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Toplam Gelir</p>
              <p className="text-2xl font-bold text-slate-900">₺{totalRevenue.toLocaleString("tr-TR")}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Toplam İşlem</p>
              <p className="text-2xl font-bold text-slate-900">{payments.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Tarih</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Plan</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Tutar</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={4} className="text-center py-8 text-slate-400">Yükleniyor...</td></tr>
            ) : payments.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8 text-slate-400">Henüz ödeme kaydı yok</td></tr>
            ) : payments.map(p => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-600">{new Date(p.created_at).toLocaleDateString("tr-TR")}</td>
                <td className="px-4 py-3 font-medium uppercase text-xs">{p.plan_id}</td>
                <td className="px-4 py-3 text-right font-semibold">₺{p.amount?.toLocaleString("tr-TR")}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
