"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { Globe, ShoppingCart, ChevronDown } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { supabase } from "@/lib/supabase-client"
import { getTemplateById } from "@/lib/musteri-bildirimleri"
import { ASISTAN_TAB_COPY, normalizeAsistanTab } from "@/lib/asistan-tabs"
import { useSubscription } from "@/hooks/useSubscription"
import { useCompany } from "@/hooks/useCompany"
import { useCart } from "@/contexts/CartContext"

const DYNAMIC_PATTERNS: { pattern: RegExp; title: string; description: string }[] = [
  { pattern: /^\/hizmetler\/paketler\/[^/]+\/duzenle$/, title: "Paket Düzenle", description: "Paket bilgilerini güncelleyebilirsiniz." },
  {
    pattern: /^\/hizmetler\/paketler\/[^/]+\/paket-planla\/[^/]+$/,
    title: "Paket Planlama",
    description: "Paket randevularınızı buradan planlayabilirsiniz.",
  },
  { pattern: /^\/hizmetler\/paketler\/[^/]+$/, title: "Paket Detayı", description: "Paket detaylarını buradan görüntüleyebilir ve düzenleyebilirsiniz." },
  { pattern: /^\/musteriler\/[^/]+\/paket\/[^/]+$/, title: "Paket Detayı", description: "Paket detaylarını buradan görüntüleyebilir ve düzenleyebilirsiniz." },
  { pattern: /^\/musteriler\/[^/]+\/duzenle$/, title: "Müşteri Düzenle", description: "Müşteri bilgilerini buradan güncelleyebilirsiniz." },
  { pattern: /^\/musteriler\/[^/]+$/, title: "Müşteri Detayı", description: "" },
  { pattern: /^\/musteriler\/yeni$/, title: "Yeni Müşteri", description: "Yeni müşteri kaydı oluşturun." },
  { pattern: /^\/hizmetler\/paketler\/yeni$/, title: "Yeni Paket", description: "Yeni bir hizmet paketi oluşturun." },
  { pattern: /^\/ayarlar\/calisanlar\/yeni$/, title: "Yeni Çalışan", description: "Yeni çalışan kaydı oluşturun." },
  { pattern: /^\/ayarlar\/calisanlar\/[^/]+$/, title: "Çalışan Detayı", description: "Çalışan bilgilerini buradan görüntüleyebilirsiniz." },
  { pattern: /^\/urunler\/yeni$/, title: "Yeni Ürün", description: "Yeni ürün kaydı oluşturun." },
  { pattern: /^\/urunler\/[^/]+$/, title: "Ürün Detayı", description: "Ürün bilgilerini görüntüleyin ve düzenleyin." },
]

const pageInfo: Record<string, { title: string; description: string }> = {
  "/": { title: "Özet", description: "Günlük işlemlerinize buradan devam edebilirsiniz." },
  "/randevular/takvim": { title: "Takvim", description: "Randevularınızı buradan yönetebilirsiniz." },
  "/randevular/online": { title: "Online Randevular", description: "Online randevularınızı buradan yönetebilirsiniz." },
  "/odemeler": { title: "Ödemeler", description: "Ödemelerinizi buradan yönetebilirsiniz." },
  "/admin/finance": { title: "Finans", description: "Kasa, defter, gelir/gider ve virman." },
  "/musteriler": { title: "Müşteriler", description: "Müşterilerinizi buradan yönetebilirsiniz." },
  "/hizmetler/hizmet-listesi": { title: "Hizmetler", description: "Hizmetlerinizi buradan yönetebilirsiniz." },
  "/hizmetler/paketler": { title: "Paketler", description: "Müşterilerin için hizmet paketleri oluştur, işlerini kolaylaştır." },
  "/hizmetler/siniflar": { title: "Sınıflar", description: "Sınıflarınızı buradan yönetebilirsiniz." },
  "/urunler": { title: "Ürünler", description: "Ürünlerinizi ve stok bilgilerini buradan yönetebilirsiniz." },
  "/pazarlama/hedef-kitleler": { title: "Hedef Kitleler", description: "Bu sayfa üzerinden yeni kampanyalar oluşturabilir, mevcut kampanyaları yönetebilir ve kampanyalarınızı atayabileceğiniz hedef kitleleri tanımlayabilirsiniz." },
  "/pazarlama/kampanyalar": { title: "Kampanyalar", description: "Kampanyalarınızı buradan yönetebilirsiniz." },
  "/ayarlar": { title: "Ayarlar", description: "Kendinize özel ayarlarınızı buradan yapabilirsiniz." },
  "/ayarlar/sirket-bilgileri": { title: "Şirket Bilgileri", description: "Şirket bilgilerini buradan düzenleyebilirsiniz." },
  "/ayarlar/calisanlar": { title: "Çalışanlar", description: "Çalışanlarınızı buradan yönetebilirsiniz." },
  "/ayarlar/hizmet-yerleri": { title: "Hizmet Yerleri", description: "" },
  "/ayarlar/online-randevular": { title: "Online Randevu Yönetimi", description: "Online randevu ayarlarınızı buradan yönetebilirsiniz." },
  "/ayarlar/musteri-bildirimleri": { title: "Bildirimler", description: "Tüm bildirimlerinizi buradan kapatabilir ve düzenleyebilirsiniz." },
  "/ayarlar/entegrasyonlar": { title: "Entegrasyonlar", description: "Entegrasyonlar ile süreçlerinizi kolaylaştırın." },
  "/ayarlar/dinamik-alanlar": { title: "Dinamik Alanlar", description: "" },
  "/ayarlar/diger": { title: "Diğer Ayarlar", description: "Modüllerinizin ve genel ayarlarınızı buradan yönetebilirsiniz." },
  "/ayarlar/demo-veri": { title: "Test verisi (Demo)", description: "Tek tıkla örnek müşteri, randevu ve ödeme verisi yükleyin veya silin." },
  "/ayarlar/sirket-bilgileri/duzenle": { title: "Şirket Bilgilerini Düzenle", description: "Şirket bilgilerinizi güncelleyin." },
  "/bildirim-paketleri/sms": { title: "SMS Paketleri", description: "SMS paketlerinizi ve kredilerinizi yönetin." },
  "/bildirim-paketleri/whatsapp": { title: "Whatsapp Paketleri", description: "Whatsapp paketlerinizi ve kredilerinizi yönetin." },
  "/hesabim": { title: "Hesabım", description: "Hesabınıza ait bilgileri buradan bulabilirsiniz." },
  "/hesabim/profil": { title: "Profilim", description: "Profil bilgilerinizi buradan güncelleyebilirsiniz." },
  "/hesabim/uyelik-iptal": { title: "Üyelik İptali", description: "Üyelik iptali talebinizi buradan oluşturabilirsiniz." },
  "/hesabim/odeme-bilgileri": { title: "Ödeme Bilgileri", description: "Ödeme yöntemlerinizi buradan yönetebilirsiniz." },
  "/hesabim/gecmis-odemeler": { title: "Geçmiş Ödemeler", description: "Geçmiş ödeme kayıtlarınızı buradan görüntüleyebilirsiniz." },
  "/hesabim/ek-paketler": { title: "Ek Paketler", description: "Planınıza ek paket ekleyebilirsiniz." },
  "/hesabim/plan-sec": { title: "Plan Seç", description: "Size uygun planı seçin." },
  "/sepet": { title: "Sepet", description: "Sepetinizdeki ürünleri görüntüleyin ve ödemeyi tamamlayın." },
  "/destek": { title: "Destek", description: "" },
  "/gizlilik": { title: "Gizlilik Politikası", description: "" },
}

type PageInfoOpts = {
  /** `/odemeler/musteriler/[id]` navbar başlığı / breadcrumb son kırıntı */
  odemelerMusteriFullName?: string | null
  /** `/hizmetler/paketler/[id]/paket-planla/...` ikinci crumb */
  paketPlanlaPkgName?: string | null
  /** `/musteriler/[id]/...` iç sayfalar: breadcrumb’ta müşteri adı */
  musterilerCustomerFullName?: string | null
}

function getPageInfoByPath(pathname: string, tab: string | null, opts?: PageInfoOpts) {
  if (pathname === "/ayarlar/calisanlar") {
    if (tab === "saatler") {
      return {
        title: "Çalışma saatleri",
        description: "Çalışma saatleri ve izin takviminizi yönetin.",
      }
    }
    if (tab === "primler") {
      return {
        title: "Primler",
        description:
          "Çalışanlar ve hizmetler için prim oranlarını belirleyin, yönetin ve güncelleyin.",
      }
    }
  }

  if (pathname === "/asistan") {
    const sekme = normalizeAsistanTab(tab)
    const c = ASISTAN_TAB_COPY[sekme]
    return { title: c.title, description: c.desc }
  }

  const notifEdit = pathname.match(/^\/ayarlar\/musteri-bildirimleri\/([^/]+)\/?$/)
  if (notifEdit) {
    const tpl = getTemplateById(notifEdit[1])
    const base = pageInfo["/ayarlar/musteri-bildirimleri"]!
    if (tpl) {
      return { title: tpl.title, description: base.description }
    }
    return { title: "Bildirim", description: base.description }
  }

  if (/^\/odemeler\/musteriler\/[^/]+$/.test(pathname)) {
    const n = opts?.odemelerMusteriFullName?.trim()
    return {
      title: n && n.length > 0 ? n : "…",
      description: "",
    }
  }

  if (pathname === "/admin/finance" && tab === "receivables") {
    return {
      title: "Finans · Alacaklar",
      description: "Ödenmemiş randevu ve paket bakiyeleri; müşteri detayından tahsilat alabilirsiniz.",
    }
  }

  if (pageInfo[pathname]) return pageInfo[pathname]
  for (const { pattern, title, description } of DYNAMIC_PATTERNS) {
    if (pattern.test(pathname)) return { title, description }
  }
  return { title: "aSistan", description: "" }
}

type Crumb = { label: string; href: string; isCurrent: boolean }

function getBreadcrumb(pathname: string, tab: string | null, opts?: PageInfoOpts): Crumb[] {
  if (!pathname || pathname === "/") return []
  if (pathname === "/randevular/takvim") return []

  if (pathname === "/ayarlar/calisanlar" && (tab === "saatler" || tab === "primler")) {
    return [
      { label: pageInfo["/ayarlar"]!.title, href: "/ayarlar", isCurrent: false },
      { label: "Çalışanlar", href: "/ayarlar/calisanlar", isCurrent: false },
      { label: getPageInfoByPath(pathname, tab, opts).title, href: "/ayarlar/calisanlar?tab=" + (tab || ""), isCurrent: true },
    ]
  }

  if (/^\/odemeler\/musteriler\/[^/]+$/.test(pathname)) {
    const n = opts?.odemelerMusteriFullName?.trim() || "…"
    return [
      { label: "Ödemeler", href: "/odemeler", isCurrent: false },
      { label: "Müşteriler", href: "/odemeler?tab=musteriler", isCurrent: false },
      { label: n, href: pathname, isCurrent: true },
    ]
  }

  /** Müşteri alt sayfaları: Müşteriler / {ad} / {bölüm} (yeni hariç) */
  {
    const m = pathname.match(/^\/musteriler\/([^/]+)/)
    if (m && m[1] !== "yeni") {
      const name = opts?.musterilerCustomerFullName?.trim() || "…"
      const customerHref = `/musteriler/${m[1]}`
      const sectionLabel = getPageInfoByPath(pathname, tab, opts).title
      return [
        { label: pageInfo["/musteriler"]!.title, href: "/musteriler", isCurrent: false },
        { label: name, href: customerHref, isCurrent: false },
        { label: sectionLabel, href: pathname, isCurrent: true },
      ]
    }
  }

  if (/^\/hizmetler\/paketler\/([^/]+)\/paket-planla\/[^/]+$/.test(pathname)) {
    const m = pathname.match(/^\/hizmetler\/paketler\/([^/]+)\/paket-planla\/[^/]+$/)
    const pkgId = m?.[1]
    const n = opts?.paketPlanlaPkgName?.trim()
    const label = n && n.length > 0 ? n : "…"
    return [
      { label: "aSistan", href: "/", isCurrent: false },
      {
        label,
        href: pkgId ? `/hizmetler/paketler/${pkgId}` : pathname,
        isCurrent: false,
      },
      { label: "Paket Planla", href: pathname, isCurrent: true },
    ]
  }

  const parts = pathname.split("/").filter(Boolean)
  if (parts.length === 0) return []
  const out: Crumb[] = []

  for (let i = 0; i < parts.length; i++) {
    const acc = "/" + parts.slice(0, i + 1).join("/")
    const isLast = i === parts.length - 1
    if (isLast) {
      out.push({ label: getPageInfoByPath(pathname, tab, opts).title, href: acc, isCurrent: true })
    } else {
      if (pageInfo[acc]) {
        out.push({ label: pageInfo[acc]!.title, href: acc, isCurrent: false })
      }
    }
  }
  if (out.length < 2) return []
  return out
}

function NavbarInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tab = searchParams.get("tab")
  const router = useRouter()
  const { companyId } = useCompany()
  const [odemelerMusteriFullName, setOdemelerMusteriFullName] = useState<string | null>(null)
  const [paketPlanlaPkgName, setPaketPlanlaPkgName] = useState<string | null>(null)
  const [musterilerCustomerFullName, setMusterilerCustomerFullName] = useState<string | null>(null)

  const pageOpts: PageInfoOpts = {
    odemelerMusteriFullName,
    paketPlanlaPkgName,
    musterilerCustomerFullName,
  }
  const info = getPageInfoByPath(pathname, tab, pageOpts)
  const breadcrumbs = getBreadcrumb(pathname, tab, pageOpts)

  const [userName, setUserName] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [userInitials, setUserInitials] = useState("U")
  const sub = useSubscription()
  const { itemCount } = useCart()

  useEffect(() => {
    const mCustomer = pathname.match(/^\/musteriler\/([^/]+)/)
    if (!mCustomer || mCustomer[1] === "yeni" || !companyId) {
      setMusterilerCustomerFullName(null)
    } else {
      const customerId = mCustomer[1]
      let cancelled = false
      void supabase
        .from("customers")
        .select("full_name")
        .eq("id", customerId)
        .eq("company_id", companyId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (cancelled) return
          if (error || !data) {
            setMusterilerCustomerFullName(null)
            return
          }
          setMusterilerCustomerFullName(data.full_name ?? null)
        })
      return () => {
        cancelled = true
      }
    }
  }, [pathname, companyId])

  useEffect(() => {
    const m = pathname.match(/^\/odemeler\/musteriler\/([^/]+)$/)
    if (!m || !companyId) {
      setOdemelerMusteriFullName(null)
      return
    }
    const customerId = m[1]
    let cancelled = false
    void supabase
      .from("customers")
      .select("full_name")
      .eq("id", customerId)
      .eq("company_id", companyId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error || !data) {
          setOdemelerMusteriFullName(null)
          return
        }
        setOdemelerMusteriFullName(data.full_name ?? null)
      })
    return () => {
      cancelled = true
    }
  }, [pathname, companyId])

  useEffect(() => {
    const m = pathname.match(/^\/hizmetler\/paketler\/([^/]+)\/paket-planla\/[^/]+$/)
    if (!m?.[1] || !companyId) {
      setPaketPlanlaPkgName(null)
      return
    }
    const packageId = m[1]
    let cancelled = false
    void supabase
      .from("packages")
      .select("name")
      .eq("id", packageId)
      .eq("company_id", companyId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error || !data?.name) {
          setPaketPlanlaPkgName(null)
          return
        }
        setPaketPlanlaPkgName(data.name)
      })
    return () => {
      cancelled = true
    }
  }, [pathname, companyId])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        const meta = data.user.user_metadata
        const name = meta?.full_name || data.user.email?.split("@")[0] || "Kullanıcı"
        const email = data.user.email || ""
        setUserName(name)
        setUserEmail(email)
        const parts = name.trim().split(" ")
        setUserInitials(parts.map((p: string) => p[0]).join("").toUpperCase().slice(0, 2))
      }
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const showTrialBanner = Boolean(userEmail) && sub.trialBannerVisible

  return (
    <header className="bg-card shrink-0 flex flex-col border-b border-border">
      {showTrialBanner && (
        <div
          className={`text-center text-sm font-medium py-2.5 px-4 ${
            sub.trialDaysLeft! <= 0 ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"
          }`}
        >
          {sub.trialDaysLeft! <= 0 ? (
            <>
              Deneme süreniz sona erdi.{" "}
              <Link href="/hesabim/plan-sec" className="underline underline-offset-2">
                Plan seçin
              </Link>
            </>
          ) : (
            <>
              Deneme sürümünün bitmesine <strong>{sub.trialDaysLeft}</strong> gün kaldı.{" "}
              <Link href="/hesabim/plan-sec" className="underline underline-offset-2">
                Plan yükselt
              </Link>
            </>
          )}
        </div>
      )}
      {/* Üst: sol üst sütunla aynı yükseklik (h-16) = logo şeridi ile hizalı */}
      <div className="h-16 min-h-16 flex items-center justify-between gap-4 px-6">
        <div className="min-w-0 flex-1 pr-2">
          <h1 className="text-sm font-semibold text-foreground truncate sm:text-base">{info.title}</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground text-xs font-medium flex items-center gap-1"
            aria-label="Dil: Türkçe"
          >
            <Globe className="h-4 w-4" />
            TR
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 text-sm text-foreground hover:text-foreground/90"
              >
                <span className="font-medium max-w-[120px] sm:max-w-[200px] truncate text-right">
                  {userName || "Kullanıcı"}
                </span>
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="h-3 w-3 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>
                <div>
                  <p className="font-semibold">{userName || "Kullanıcı"}</p>
                  <p className="text-xs text-muted-foreground font-normal truncate">{userEmail}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <span className="text-sm">Dil</span>
                <span className="ml-auto text-xs text-muted-foreground">Türkçe</span>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/hesabim/profil">Profilim</Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600 cursor-pointer" onClick={handleLogout}>
                Çıkış Yap
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link href="/sepet" className="relative text-muted-foreground hover:text-foreground shrink-0" aria-label="Sepet">
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] rounded-full min-w-4 h-4 px-0.5 flex items-center justify-center">
                {itemCount > 9 ? "9+" : itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {breadcrumbs.length > 0 && (
        <div className="px-6 py-2.5 border-t border-border bg-muted/40">
          <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-x-1.5 gap-y-1 text-sm">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.href + ":" + i} className="flex items-center gap-1.5 min-w-0">
                {i > 0 && <span className="text-muted-foreground/70 select-none">/</span>}
                {crumb.isCurrent ? (
                  <span className="text-muted-foreground font-medium truncate">{crumb.label}</span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-primary font-medium hover:text-primary/90 hover:underline truncate"
                  >
                    {crumb.label}
                  </Link>
                )}
              </span>
            ))}
          </nav>
        </div>
      )}

      {info.description && (
        <p className="px-6 py-2 text-xs text-muted-foreground border-t border-border">
          {info.description}
        </p>
      )}
    </header>
  )
}

export function Navbar() {
  return (
    <Suspense
      fallback={
        <header className="bg-card border-b border-border shrink-0 h-16 min-h-16" />
      }
    >
      <NavbarInner />
    </Suspense>
  )
}
