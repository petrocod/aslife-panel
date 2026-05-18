"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Building2,
  Store,
  Users,
  CreditCard,
  LifeBuoy,
  DollarSign,
  MessageSquare,
  BarChart3,
  Flag,
  Server,
  Settings,
  Shield,
  Tags,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase-client"

interface AdminNavItem {
  label: string
  href: string
  icon: React.ReactNode
}

const adminNavItems: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Organizasyonlar", href: "/admin/organizations", icon: <Building2 className="h-4 w-4" /> },
  { label: "Şirketler", href: "/admin/companies", icon: <Store className="h-4 w-4" /> },
  { label: "Kullanıcılar", href: "/admin/users", icon: <Users className="h-4 w-4" /> },
  { label: "Abonelikler", href: "/admin/subscriptions", icon: <CreditCard className="h-4 w-4" /> },
  { label: "Fiyatlandırma", href: "/admin/pricing", icon: <Tags className="h-4 w-4" /> },
  { label: "Destek Talepleri", href: "/admin/tickets", icon: <LifeBuoy className="h-4 w-4" /> },
  { label: "Gelir & Ödemeler", href: "/admin/revenue", icon: <DollarSign className="h-4 w-4" /> },
  { label: "SMS & Bildirimler", href: "/admin/notifications", icon: <MessageSquare className="h-4 w-4" /> },
  { label: "Analitik", href: "/admin/analytics", icon: <BarChart3 className="h-4 w-4" /> },
  { label: "Feature Flags", href: "/admin/features", icon: <Flag className="h-4 w-4" /> },
  { label: "Sistem", href: "/admin/system", icon: <Server className="h-4 w-4" /> },
  { label: "Ayarlar", href: "/admin/settings", icon: <Settings className="h-4 w-4" /> },
]

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin"
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AdminSidebar() {
  const pathname = usePathname()
  const [companyName, setCompanyName] = useState<string>("")

  useEffect(() => {
    async function loadCompanyName() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single()
      if (!profile?.company_id) return
      const { data: company } = await supabase
        .from("companies")
        .select("name")
        .eq("id", profile.company_id)
        .single()
      if (company?.name) setCompanyName(company.name)
    }
    loadCompanyName()
  }, [])

  return (
    <aside className="flex flex-col w-[240px] h-screen min-h-0 shrink-0 bg-white border-r border-slate-200 text-slate-700">
      {/* Logo */}
      <Link
        href="/admin"
        className="h-16 min-h-16 shrink-0 flex items-center gap-2.5 px-5 border-b border-slate-100 hover:opacity-90 transition-opacity"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
          <span className="text-white font-bold text-sm">a</span>
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-slate-900 font-bold text-sm truncate max-w-[160px]">
            {companyName || "Admin Panel"}
          </span>
          <span className="text-[10px] font-medium text-orange-500 tracking-wider uppercase">aSistan</span>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {adminNavItems.map((item) => {
          const active = isActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                active
                  ? "bg-orange-50 text-orange-700 shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              )}
            >
              <span className={cn("transition-colors", active ? "text-orange-500" : "text-slate-400")}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-slate-100 px-3 py-4">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all duration-150"
        >
          <LayoutDashboard className="h-4 w-4" />
          Ana Uygulamaya Dön
        </Link>
      </div>
    </aside>
  )
}
