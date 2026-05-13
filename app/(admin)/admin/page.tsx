"use client"

import { useEffect, useState } from "react"
import {
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  Ticket,
  MessageSquare,
  CalendarPlus,
  Activity,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase-client"

interface DashboardStats {
  totalOrganizations: number
  activeSubscriptions: number
  mrr: number
  trialConversionRate: number
  newRegistrations7d: number
  activeUsersToday: number
  openTickets: number
  smsUsage: number
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.access_token) {
          setError("Oturum bulunamadı")
          setLoading(false)
          return
        }

        const res = await fetch("/api/admin/stats", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        if (!res.ok) {
          setError("Yetkisiz erişim")
          setLoading(false)
          return
        }

        const data = await res.json()
        setStats(data)
      } catch {
        setError("Veriler yüklenirken hata oluştu")
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-500 text-lg font-medium">{error}</p>
          <p className="text-gray-500 mt-2 text-sm">
            Admin paneline erişim yetkiniz olduğundan emin olun.
          </p>
        </div>
      </div>
    )
  }

  if (!stats) return null

  const kpiCards = [
    {
      title: "Toplam Organizasyon",
      value: stats.totalOrganizations.toLocaleString("tr-TR"),
      icon: Building2,
      color: "blue" as const,
    },
    {
      title: "Aktif Abonelik",
      value: stats.activeSubscriptions.toLocaleString("tr-TR"),
      icon: Users,
      color: "green" as const,
    },
    {
      title: "Aylık Gelir (MRR)",
      value: new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
      }).format(stats.mrr),
      icon: CreditCard,
      color: "purple" as const,
    },
    {
      title: "Trial → Aktif Dönüşüm",
      value: `%${stats.trialConversionRate}`,
      icon: TrendingUp,
      color: "orange" as const,
    },
  ]

  const statItems = [
    {
      title: "Yeni kayıtlar (son 7 gün)",
      value: stats.newRegistrations7d.toLocaleString("tr-TR"),
      icon: CalendarPlus,
    },
    {
      title: "Aktif kullanıcılar (bugün)",
      value: stats.activeUsersToday.toLocaleString("tr-TR"),
      icon: Activity,
    },
    {
      title: "Açık destek talepleri",
      value: stats.openTickets.toLocaleString("tr-TR"),
      icon: Ticket,
    },
    {
      title: "SMS kullanımı",
      value: stats.smsUsage.toLocaleString("tr-TR"),
      icon: MessageSquare,
    },
  ]

  const colorMap = {
    blue: {
      bg: "bg-blue-50",
      icon: "text-blue-600",
      border: "border-blue-100",
    },
    green: {
      bg: "bg-green-50",
      icon: "text-green-600",
      border: "border-green-100",
    },
    purple: {
      bg: "bg-purple-50",
      icon: "text-purple-600",
      border: "border-purple-100",
    },
    orange: {
      bg: "bg-orange-50",
      icon: "text-orange-600",
      border: "border-orange-100",
    },
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">Platform genel istatistikleri</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpiCards.map((card) => {
          const colors = colorMap[card.color]
          return (
            <div
              key={card.title}
              className={cn(
                "bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-shadow",
                colors.border
              )}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-500">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {card.value}
                  </p>
                </div>
                <div className={cn("p-3 rounded-lg", colors.bg)}>
                  <card.icon className={cn("h-6 w-6", colors.icon)} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Detaylı İstatistikler
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {statItems.map((item) => (
            <div
              key={item.title}
              className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <item.icon className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{item.title}</p>
                  <p className="text-xl font-bold text-gray-900">
                    {item.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
