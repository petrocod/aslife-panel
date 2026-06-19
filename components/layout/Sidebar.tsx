"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo, useState } from "react"
import {
  CalendarDays,
  Users,
  CreditCard,
  Wrench,
  BarChart3,
  Settings,
  Bell,
  Globe,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Package,
  GraduationCap,
  Megaphone,
  Target,
  Bot,
  Layers,
  ShoppingBag,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useCompany } from "@/hooks/useCompany"
import { usePlatformFlags } from "@/hooks/usePlatformFlags"
import { useProfilePermissions } from "@/hooks/useProfilePermissions"
import { SidebarAppMeta } from "@/components/layout/SidebarAppMeta"
import { DEMO_COMPANY_ID, DEMO_MAX_APPOINTMENTS } from "@/lib/demo-limits"
import type { PermissionModuleKey } from "@/lib/profile-permissions"

interface NavItem {
  label: string
  href?: string
  icon: React.ReactNode
  badge?: string
  children?: NavItem[]
  /** Module permission key; omitted = always visible if parent visible */
  permission?: PermissionModuleKey
  /** Platform flag key from feature_flags */
  platformFlag?: "online_randevu" | "siniflar_module"
}

const navItems: NavItem[] = [
  {
    label: "Randevular",
    href: "/randevular/takvim",
    icon: <CalendarDays className="h-4 w-4" />,
    permission: "randevular",
    children: [
      { label: "Takvim", href: "/randevular/takvim", icon: <CalendarDays className="h-4 w-4" /> },
      {
        label: "Online",
        href: "/randevular/online",
        icon: <Globe className="h-4 w-4" />,
        platformFlag: "online_randevu",
      },
    ],
  },
  {
    label: "Ödemeler",
    href: "/odemeler",
    icon: <CreditCard className="h-4 w-4" />,
    permission: "odemeler",
  },
  {
    label: "Finans",
    href: "/admin/finance",
    icon: <BarChart3 className="h-4 w-4" />,
    permission: "finans",
  },
  {
    label: "Müşteriler",
    href: "/musteriler",
    icon: <Users className="h-4 w-4" />,
    permission: "musteriler",
  },
  {
    label: "Hizmetler",
    icon: <Wrench className="h-4 w-4" />,
    permission: "hizmetler",
    children: [
      { label: "Hizmet listesi", href: "/hizmetler/hizmet-listesi", icon: <Layers className="h-4 w-4" /> },
      { label: "Paketler", href: "/hizmetler/paketler", icon: <Package className="h-4 w-4" /> },
      {
        label: "Sınıflar",
        href: "/hizmetler/siniflar",
        icon: <GraduationCap className="h-4 w-4" />,
        platformFlag: "siniflar_module",
      },
    ],
  },
  {
    label: "Ürünler",
    href: "/urunler",
    icon: <ShoppingBag className="h-4 w-4" />,
    permission: "urunler",
  },
  {
    label: "Pazarlama",
    icon: <Megaphone className="h-4 w-4" />,
    badge: "YENİ",
    permission: "pazarlama",
    children: [
      { label: "Hedef Kitleler", href: "/pazarlama/hedef-kitleler", icon: <Target className="h-4 w-4" /> },
      { label: "Kampanyalar", href: "/pazarlama/kampanyalar", icon: <Megaphone className="h-4 w-4" /> },
    ],
  },
  {
    label: "Asistan",
    href: "/asistan",
    icon: <Bot className="h-4 w-4" />,
    permission: "asistan",
  },
  {
    label: "Ayarlar",
    href: "/ayarlar",
    icon: <Settings className="h-4 w-4" />,
    permission: "ayarlar",
  },
  {
    label: "Bildirim Paketleri",
    icon: <Bell className="h-4 w-4" />,
    permission: "bildirim_paketleri",
    children: [
      { label: "SMS", href: "/bildirim-paketleri/sms", icon: <MessageSquare className="h-4 w-4" /> },
      { label: "Whatsapp", href: "/bildirim-paketleri/whatsapp", icon: <MessageSquare className="h-4 w-4" /> },
    ],
  },
]

function filterNavItems(
  items: NavItem[],
  opts: {
    onlineRandevu: boolean
    siniflarModule: boolean
    canAccess: (m: PermissionModuleKey) => boolean
  }
): NavItem[] {
  return items
    .map((item) => {
      if (item.platformFlag === "online_randevu" && !opts.onlineRandevu) return null
      if (item.platformFlag === "siniflar_module" && !opts.siniflarModule) return null
      if (item.permission && !opts.canAccess(item.permission)) return null

      let children = item.children
      if (children?.length) {
        children = filterNavItems(children, opts)
        if (children.length === 0 && !item.href) return null
      }
      return { ...item, children }
    })
    .filter(Boolean) as NavItem[]
}

/** Aktif bağlantı: path eşlemesi (?sonrası yok sayılır); alt route’lar da aktif sayılır */
function navHrefActive(pathname: string, href: string): boolean {
  const pathOnly = href.split("?", 2)[0] ?? href
  return pathname === pathOnly || pathname.startsWith(`${pathOnly}/`)
}

function shouldExpandGroup(item: NavItem, pathname: string) {
  if (!item.children?.length) return false
  if (item.href && pathname === item.href) return true
  return item.children.some((child) => child.href && pathname.startsWith(child.href))
}

function NavItemComponent({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(() => shouldExpandGroup(item, pathname))

  const isActive = item.href ? navHrefActive(pathname, item.href) : false
  const hasChildren = item.children && item.children.length > 0

  if (hasChildren) {
    const headerIsActive = item.href
      ? pathname === item.href || pathname.startsWith(item.href + "/")
      : false

    return (
      <div>
        <div
          className={cn(
            "flex items-center justify-between rounded-lg text-sm font-medium transition-all duration-150",
            headerIsActive
              ? "bg-[hsl(var(--sidebar-foreground)/0.14)] text-sidebar-foreground"
              : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
          )}
        >
          {/* Label: if has href, navigate; otherwise just toggle */}
          {item.href ? (
            <Link
              href={item.href}
              className="flex items-center gap-3 px-4 py-2.5 flex-1 min-w-0"
              onClick={() => setIsOpen(true)}
            >
              {item.icon}
              {item.label}
              {item.badge && (
                <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded font-bold">
                  {item.badge}
                </span>
              )}
            </Link>
          ) : (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-3 px-4 py-2.5 flex-1 min-w-0 text-left"
            >
              {item.icon}
              {item.label}
              {item.badge && (
                <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          )}
          {/* Chevron toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="px-3 py-2.5 hover:text-sidebar-foreground"
          >
            {isOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        </div>
        {isOpen && (
          <div className="ml-4 mt-1 space-y-0.5 border-l border-sidebar-border pl-3">
            {item.children!.map((child) => (
              <NavItemComponent key={`${child.label}:${child.href ?? ""}`} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Link
      href={item.href!}
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
        isActive
          ? "bg-[hsl(var(--sidebar-foreground)/0.14)] text-sidebar-foreground"
          : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
      )}
    >
      {item.icon}
      {item.label}
      {item.badge && (
        <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded font-bold ml-auto">
          {item.badge}
        </span>
      )}
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { companyId, userId } = useCompany()
  const { onlineRandevu, siniflarModule } = usePlatformFlags()
  const { canAccess } = useProfilePermissions()

  const visibleNav = useMemo(() => {
    return filterNavItems(navItems, {
      onlineRandevu,
      siniflarModule,
      canAccess,
    })
  }, [onlineRandevu, siniflarModule, canAccess])

  const showDemoLimits =
    companyId !== null && companyId !== undefined && companyId === DEMO_COMPANY_ID

  return (
    <aside className="flex flex-col w-[220px] h-screen min-h-0 bg-sidebar text-sidebar-foreground shrink-0">
      {/* Logo — yükseklik üst satır (Navbar ile aynı) */}
      <Link
        href="/"
        className="h-16 min-h-16 shrink-0 flex items-center gap-2.5 px-4 border-b border-sidebar-border hover:opacity-90 transition-opacity"
      >
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0 shadow-sm">
          <span className="text-primary-foreground font-bold text-sm">a</span>
        </div>
        <span className="text-sidebar-foreground font-bold text-lg leading-none">aSistan</span>
      </Link>

      {showDemoLimits && (
        <div className="mx-2 mt-2 mb-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-[11px] leading-snug text-amber-100">
          <span className="font-semibold text-amber-50">Demo sınırı:</span> Takvimde en fazla{" "}
          {DEMO_MAX_APPOINTMENTS} randevu.
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {visibleNav.map((item) => (
          <NavItemComponent
            key={item.children?.length ? `${item.label}::${pathname}` : item.label}
            item={item}
          />
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-sidebar-border px-2 py-3 space-y-0.5">
        <Link
          href="/hesabim"
          className={cn(
            "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
            pathname === "/hesabim"
              ? "bg-[hsl(var(--sidebar-foreground)/0.14)] text-sidebar-foreground"
              : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
          )}
        >
          <Users className="h-4 w-4" />
          Hesabım
        </Link>
        <Link
          href="/destek"
          className={cn(
            "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
            pathname === "/destek"
              ? "bg-[hsl(var(--sidebar-foreground)/0.14)] text-sidebar-foreground"
              : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
          )}
        >
          <MessageSquare className="h-4 w-4" />
          Destek
        </Link>

        {/* SMS Usage Bar */}
        <div className="px-4 py-3 mt-2">
          <div className="flex items-center justify-between text-xs text-sidebar-muted mb-1">
            <span>Kalan Bildirimler</span>
            <span className="text-sidebar-foreground font-medium">98%</span>
          </div>
          <div className="w-full bg-sidebar-foreground/15 rounded-full h-1.5">
            <div
              className="bg-gradient-to-r from-emerald-400/90 to-primary h-1.5 rounded-full"
              style={{ width: "98%" }}
            />
          </div>
          <Link href="/hesabim/ek-paketler" className="text-primary text-xs mt-1 block hover:underline">
            Satın al →
          </Link>
        </div>

        <div className="mt-2 border-t border-sidebar-foreground/10 px-4 pb-3 pt-3">
          <Link href="/gizlilik" className="text-sidebar-muted text-xs hover:text-sidebar-foreground/90">
            Gizlilik Politikası
          </Link>
          <SidebarAppMeta />
        </div>
      </div>
    </aside>
  )
}
