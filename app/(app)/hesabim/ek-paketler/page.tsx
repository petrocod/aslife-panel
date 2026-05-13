"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { MessageSquare, Phone, Users } from "lucide-react"

const whatsappPackages = [
  { id: "wp_500", title: "500 WhatsApp Kredisi", price: "₺275,00", credits: 500 },
  { id: "wp_1000", title: "1.000 WhatsApp Kredisi", price: "₺500,00", credits: 1000 },
  { id: "wp_3000", title: "3.000 WhatsApp Kredisi", price: "₺1.350,00", credits: 3000 },
]

const smsPackages = [
  { id: "sms_500", title: "500 SMS Kredisi", price: "₺275,00", credits: 500 },
  { id: "sms_1000", title: "1.000 SMS Kredisi", price: "₺500,00", credits: 1000 },
  { id: "sms_3000", title: "3.000 SMS Kredisi", price: "₺1.350,00", credits: 3000 },
]

const userPackages = [
  { id: "user_1", title: "1 Ek Kullanıcı", price: "₺2.592,00", desc: "Aylık" },
  { id: "user_2", title: "2 Ek Kullanıcı", price: "₺5.184,00", desc: "Aylık" },
]

export default function EkPaketlerPage() {
  const router = useRouter()

  return (
    <div className="p-6 space-y-10">
      {/* SMS Packages */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Phone className="w-4 h-4 text-blue-600" />
          </div>
          <h2 className="text-base font-semibold text-slate-800">SMS Paketleri</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {smsPackages.map((pkg) => (
            <div key={pkg.id} className="bg-white border-2 border-blue-100 rounded-xl p-5 text-center hover:border-blue-300 transition-colors">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Phone className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-sm font-semibold text-slate-800 mb-1">{pkg.title}</p>
              <p className="text-lg font-bold text-blue-700 mb-1">{pkg.price}</p>
              <p className="text-[11px] text-slate-400 mb-4">{(parseFloat(pkg.price.replace(/[₺.]/g, "").replace(",", ".")) / pkg.credits * 1000).toFixed(0)} kuruş / SMS</p>
              <Button
                size="sm"
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => router.push(`/hesabim/odeme?type=sms_package&packageId=${pkg.id}`)}
              >
                Satın Al
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* WhatsApp Packages */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-green-600" />
          </div>
          <h2 className="text-base font-semibold text-slate-800">WhatsApp Paketleri</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {whatsappPackages.map((pkg) => (
            <div key={pkg.id} className="bg-white border-2 border-green-100 rounded-xl p-5 text-center hover:border-green-300 transition-colors">
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm font-semibold text-slate-800 mb-1">{pkg.title}</p>
              <p className="text-lg font-bold text-green-700 mb-1">{pkg.price}</p>
              <p className="text-[11px] text-slate-400 mb-4">{(parseFloat(pkg.price.replace(/[₺.]/g, "").replace(",", ".")) / pkg.credits * 1000).toFixed(0)} kuruş / mesaj</p>
              <Button
                size="sm"
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => router.push(`/hesabim/odeme?type=whatsapp_package&packageId=${pkg.id}`)}
              >
                Satın Al
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* User Packages */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-purple-600" />
            </div>
            <h2 className="text-base font-semibold text-slate-800">Kullanıcı Paketleri</h2>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push("/hesabim/plan-sec")}>
            Plan Değiştir
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {userPackages.map((pkg) => (
            <div key={pkg.id} className="bg-white border-2 border-purple-100 rounded-xl p-5 text-center hover:border-purple-300 transition-colors">
              <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-sm font-semibold text-slate-800 mb-1">{pkg.title}</p>
              <p className="text-lg font-bold text-purple-700 mb-1">{pkg.price}</p>
              <p className="text-[11px] text-slate-400 mb-4">{pkg.desc}</p>
              <Button
                size="sm"
                className="w-full bg-purple-600 hover:bg-purple-700"
                onClick={() => router.push(`/hesabim/odeme?type=user_package&packageId=${pkg.id}`)}
              >
                Satın Al
              </Button>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Mevcut planınızı değiştirmek veya daha fazla kullanıcı kapasitesi için{" "}
          <button onClick={() => router.push("/hesabim/plan-sec")} className="text-blue-600 hover:underline">
            Plan Seçimi
          </button>{" "}
          sayfasını ziyaret edin.
        </p>
      </section>
    </div>
  )
}
