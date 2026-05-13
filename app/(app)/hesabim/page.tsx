"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase-client"
import { Loader2 } from "lucide-react"

export default function HesabimPage() {
  const [userId, setUserId] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserId(data.user.id.slice(0, 8).toUpperCase())
      }
      setLoading(false)
    })
  }, [])

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex justify-end mb-4">
        <Link href="/hesabim/uyelik-iptal">
          <Button variant="outline" size="sm" className="text-xs text-red-500 border-red-200 hover:bg-red-50">
            Üyelik iptali talebi oluştur
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        {/* Üyelik bilgileri */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-700 mb-4">Üyelik bilgileri</h3>
          <div className="bg-slate-50 rounded-lg px-5 py-4 flex items-center gap-2">
            <span className="text-slate-400">🪪</span>
            <div>
              <p className="text-xs text-slate-500">Üyelik numarası</p>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400 mt-1" />
              ) : (
                <p className="text-sm font-medium text-slate-800">#{userId || "000000"}</p>
              )}
            </div>
          </div>
        </div>

        {/* Üyelik bilgileri (ödeme) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-700 mb-4">Ödeme Bilgileri</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">💳</span>
                <span className="text-sm text-slate-700">Ödeme bilgileri</span>
              </div>
              <Link href="/hesabim/odeme-bilgileri" className="text-xs text-blue-600 hover:underline">Yönet</Link>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">📋</span>
                <span className="text-sm text-slate-700">Geçmiş ödemeler</span>
              </div>
              <Link href="/hesabim/gecmis-odemeler" className="text-xs text-blue-600 hover:underline">Göster</Link>
            </div>
          </div>
        </div>

        {/* Planım */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-700 mb-4">Planım</h3>
          <div className="bg-slate-50 rounded-lg p-5 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-slate-400">📋</span>
                <span className="text-sm font-medium text-slate-700">Plan ayrıntıları</span>
              </div>
              <p className="text-sm text-slate-600">Demo • 3 Kullanıcı • 100 Sms Kredisi</p>
            </div>
            <Link href="/hesabim/plan-sec">
              <Button size="sm" variant="outline" className="text-xs text-blue-600 border-blue-200">
                Plan Satın Al
              </Button>
            </Link>
          </div>
        </div>

        {/* Ek Paketler */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-700 mb-2">Ek Paketler</h3>
          <p className="text-sm text-slate-500 mb-4">İşletmenize uygun ihtiyaçları planınıza ekleyebilirsiniz.</p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: "💬", title: "Sms Paketleri", href: "/hesabim/ek-paketler" },
              { icon: "👤", title: "Kullanıcı paketleri", href: "/hesabim/ek-paketler" },
              { icon: "📦", title: "Ekstra Modüller", href: "/hesabim/ek-paketler" },
            ].map((item) => (
              <div key={item.title} className="border border-slate-200 rounded-lg p-4 flex flex-col items-center text-center">
                <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-white text-xl mb-2">
                  {item.icon}
                </div>
                <p className="text-xs font-medium text-slate-700 mb-2">{item.title}</p>
                <Link href={item.href}>
                  <Button variant="outline" size="sm" className="text-xs w-full">Planlara git →</Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
