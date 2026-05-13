"use client"

import Link from "next/link"
import {
  Building2,
  Clock,
  Users,
  Layers,
  Globe,
  MessageSquare,
  Link2,
  PenLine,
  Settings2,
  Crown,
  Database,
} from "lucide-react"
import { useCompany, DEMO_COMPANY_ID } from "@/hooks/useCompany"

const settingsItems = [
  {
    href: "/ayarlar/sirket-bilgileri",
    icon: Building2,
    title: "Şirket bilgileri",
    description: "Logonuzu yükleyin, şirket hakkında bilgilerinizi ekleyin, alanlarınızı kişiselleştirin",
  },
  {
    href: "/ayarlar/calisanlar?tab=saatler",
    icon: Clock,
    title: "Çalışma gün ve saatleri",
    description: "Çalışanlar bölümünde Çalışma Saatleri sekmesinden yönetin",
  },
  {
    href: "/ayarlar/calisanlar",
    icon: Users,
    title: "Çalışanlar",
    description: "Çalışan ekleyin veya mevcut çalışanı düzenleyin ve onlara hizmet atayın",
  },
  {
    href: "/ayarlar/hizmet-yerleri",
    icon: Layers,
    title: "Hizmet yerleri",
    description: "Hizmet yerlerinizi yönetin ve daha sonra bunları belirli hizmetlere atayın.",
  },
  {
    href: "/ayarlar/online-randevular",
    icon: Globe,
    title: "Online randevular",
    description: "Online randevular için hizmetlerinizi ve izinlerinizi yönetin.",
  },
  {
    href: "/ayarlar/musteri-bildirimleri",
    icon: MessageSquare,
    title: "Müşteri bildirimleri",
    description: "Müşterilerinize SMS ve e-posta yoluyla gönderilen mesajları düzenleyin",
  },
  {
    href: "/ayarlar/abonelik",
    icon: Crown,
    title: "Abonelik ve Erişim",
    description: "Plan yönetimi, kullanıcı erişim seviyeleri ve modül ayarları",
  },
  {
    href: "/ayarlar/entegrasyonlar",
    icon: Link2,
    title: "Entegrasyonlar",
    description: "Entegrasyonlar ile süreçlerinizi kolaylaştırın ve kolaylaştırın.",
  },
  {
    href: "/ayarlar/dinamik-alanlar",
    icon: PenLine,
    title: "Dinamik alanlar",
    description: "İşinizle ilgili alanlar oluşturun, formları kişiselleştirin.",
  },
  {
    href: "/ayarlar/diger",
    icon: Settings2,
    title: "Diğer",
    description: "Genel ayarlarınızı yönetin",
  },
]

export default function AyarlarPage() {
  const { companyId, email } = useCompany()
  const isDemo = companyId === DEMO_COMPANY_ID || (email && email.includes("test"))

  return (
    <div className="p-6">
      <p className="text-sm text-slate-500 mb-6">Kendinize özel ayarlarınızı buradan yapabilirsiniz.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {settingsItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-center text-center hover:border-blue-200 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <item.icon className="h-7 w-7 text-blue-500" strokeWidth={1.5} />
            </div>
            <h3 className="font-semibold text-slate-800 text-sm mb-2 leading-tight">{item.title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
          </Link>
        ))}
        {isDemo && (
          <Link
            href="/ayarlar/demo-veri"
            className="bg-white rounded-xl border border-amber-200 p-6 flex flex-col items-center text-center hover:border-amber-300 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Database className="h-7 w-7 text-amber-500" strokeWidth={1.5} />
            </div>
            <h3 className="font-semibold text-slate-800 text-sm mb-2 leading-tight">Test verisi (Demo)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Demo ortamı için test verisi yönetimi</p>
          </Link>
        )}
      </div>
    </div>
  )
}
