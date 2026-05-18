"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Check, X, ShoppingCart, Loader2 } from "lucide-react"
import { useSubscription } from "@/hooks/useSubscription"
import { useCatalog } from "@/hooks/useCatalog"
import { useCart } from "@/contexts/CartContext"
import { formatTry, planUnitPrice } from "@/lib/catalog/defaults"
import { cn } from "@/lib/utils"
import type { CatalogPlan } from "@/lib/catalog/types"

const features = [
  { name: "Takvim kullanımı ve randevu oluşturma", asistan: true, asistanPlus: true, asistanPro: true },
  { name: "Randevu onay ve hatırlatma", asistan: true, asistanPlus: true, asistanPro: true },
  { name: "Kullanıcı sayısı", asistan: "Maks. 1", asistanPlus: "Maks. 3", asistanPro: "Maks. 6" },
  { name: "Bildirim, SMS, e-Posta gönderme", asistan: true, asistanPlus: true, asistanPro: true },
  { name: "Pakete dahil SMS paketi", asistan: "250", asistanPlus: "750", asistanPro: "1500" },
  { name: "Grup ders, etkinlik oluşturma ve yönetme", asistan: true, asistanPlus: true, asistanPro: true },
  { name: "Google, Outlook, Apple takvim senk.", asistan: true, asistanPlus: true, asistanPro: true },
  { name: "Güncel durum görünümü", asistan: true, asistanPlus: true, asistanPro: true },
  { name: "Excel aktarımı", asistan: true, asistanPlus: true, asistanPro: true },
  { name: "Online ödeme entegrasyonu", asistan: false, asistanPlus: true, asistanPro: true },
  { name: "İşletme hizmet yerleri yönetimi", asistan: false, asistanPlus: true, asistanPro: true },
  { name: "Personel yönetimi", asistan: false, asistanPlus: true, asistanPro: true },
  { name: "Asistan ve raporlama özelliği", asistan: false, asistanPlus: false, asistanPro: true },
  { name: "Kampanya ve promosyon düzenleme", asistan: false, asistanPlus: false, asistanPro: true },
  { name: "e-Fatura entegrasyonu", asistan: false, asistanPlus: false, asistanPro: true },
]

function yearlyNote(plan: CatalogPlan) {
  const annualWithVat = plan.annual_price * 1.2
  return `Yılda ${formatTry(annualWithVat)} (KDV dahil) olarak faturalandırılacaktır.`
}

export default function PlanSecPage() {
  const [billing, setBilling] = useState<"yearly" | "monthly">("yearly")
  const { planId, planName, loading: subLoading } = useSubscription()
  const { catalog, loading: catalogLoading } = useCatalog()
  const { addItem, itemCount } = useCart()
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [addedToast, setAddedToast] = useState(false)

  const plans = catalog.plans
  const selectedPlan = plans.find((p) => p.id === selectedPlanId)
  const loading = subLoading || catalogLoading

  const handleCardClick = (planIdValue: string, isCurrent: boolean) => {
    if (isCurrent) return
    setSelectedPlanId((prev) => (prev === planIdValue ? null : planIdValue))
  }

  const handleAddToCart = () => {
    if (!selectedPlan) return
    const unitPrice = planUnitPrice(selectedPlan, billing)
    addItem({
      type: "subscription",
      productKey: selectedPlan.id,
      title: `${selectedPlan.name_tr} (${billing === "yearly" ? "Yıllık" : "Aylık"})`,
      unitPrice,
      billing,
    })
    setAddedToast(true)
    setTimeout(() => setAddedToast(false), 2500)
  }

  return (
    <div className="p-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Plan seç</h2>
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBilling("yearly")}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                billing === "yearly" ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-600"
              )}
            >
              Yıllık Abonelik
            </button>
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                billing === "monthly" ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-600"
              )}
            >
              Aylık Abonelik
            </button>
          </div>
          {billing === "yearly" && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-xs font-medium px-4 py-2 rounded-lg">
              Yıllık aboneliklerde <strong>%30 tasarruf</strong> edin — 12 ay ödeyin, 10 ay fiyatıyla kullanın!
            </div>
          )}
        </div>
      </div>

      <div className="text-xs text-slate-500 mb-6 space-y-1">
        <p>Planlar</p>
        <ul className="list-disc list-inside space-y-0.5 ml-2">
          <li>Ücretsiz deneme sürecinde kredi kartı bilginizi vermeniz gerekmez.</li>
          <li>
            <strong>Kullanıcı sayısı</strong> uygulamada kullanılacak olan ve ekleyebileceğiniz maximum kişi
            sayısını ifade eder
          </li>
          <li>
            Yıllık Paketlerde faturalama <strong>Yıllık</strong> olarak Aylık Paketlerde ise{" "}
            <strong>Aylık</strong> olarak yapılmaktadır.
          </li>
        </ul>
      </div>

      {!loading && planId && (
        <p className="text-center text-sm text-slate-600 mb-4">
          Mevcut planınız: <strong className="text-slate-800">{planName}</strong> — yükseltmek için aşağıdan seçim
          yapabilirsiniz.
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {plans.map((plan) => {
              const isCurrent = planId === plan.id
              const isSelected = selectedPlanId === plan.id
              const displayPrice =
                billing === "yearly"
                  ? formatTry(plan.annual_price / 12)
                  : formatTry(plan.monthly_price)
              const highlighted = plan.highlighted

              return (
                <div
                  key={plan.id}
                  onClick={() => handleCardClick(plan.id, isCurrent)}
                  className={cn(
                    "relative rounded-xl border-2 p-6 transition-all duration-200 bg-white",
                    isCurrent
                      ? "ring-2 ring-emerald-500 ring-offset-2 border-emerald-400/80 cursor-default opacity-80"
                      : "cursor-pointer hover:shadow-lg",
                    !isCurrent && isSelected
                      ? "border-orange-500 shadow-xl scale-[1.02]"
                      : !isCurrent && highlighted
                        ? "border-orange-400 shadow-lg hover:border-orange-500"
                        : !isCurrent
                          ? "border-slate-200 hover:border-orange-200"
                          : ""
                  )}
                >
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-full">
                      Mevcut Plan
                    </div>
                  )}
                  {!isCurrent && isSelected && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1">
                      <Check className="h-3 w-3" /> Seçildi
                    </div>
                  )}
                  {highlighted && !isSelected && !isCurrent && (
                    <div className="bg-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-full w-fit mb-3">
                      EN POPÜLER
                    </div>
                  )}
                  <p className="text-xs font-bold text-orange-500 mb-1">{plan.name_tr}</p>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-3xl font-bold text-slate-800">{displayPrice}</span>
                    <span className="text-xs text-slate-500 mb-1">/ ay</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-1">+ %20 KDV</p>
                  <p className="text-sm font-medium text-slate-700 mb-2">Maks. {plan.max_users} Kullanıcı</p>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">{plan.description_tr}</p>
                  <p className="text-xs font-medium text-slate-700 mb-1">
                    Ücretsiz {plan.sms_included} SMS dahil
                  </p>
                  <p className="text-xs text-slate-500 mb-4">
                    {plan.max_users} Kullanıcı, {plan.sms_included} SMS
                  </p>
                  <Button
                    className={cn(
                      "w-full transition-all",
                      isSelected && "bg-orange-500 hover:bg-orange-600 text-white"
                    )}
                    variant={isSelected ? "default" : highlighted ? "default" : "outline"}
                    disabled={isCurrent}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCardClick(plan.id, isCurrent)
                    }}
                  >
                    {isCurrent ? "Mevcut Plan" : isSelected ? "✓ Seçildi" : "Seç"}
                  </Button>
                  <p className="text-xs text-slate-400 mt-3 text-center">{yearlyNote(plan)}</p>
                </div>
              )
            })}
          </div>

          <div className="flex flex-col items-center gap-3 mb-10">
            <Button
              size="lg"
              disabled={!selectedPlanId}
              onClick={handleAddToCart}
              className={cn(
                "px-10 py-3 text-base font-semibold transition-all",
                selectedPlanId
                  ? "bg-orange-500 hover:bg-orange-600 text-white shadow-lg"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              )}
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Sepete Ekle
            </Button>
            {addedToast && (
              <p className="text-sm text-emerald-600 font-medium">Plan sepete eklendi!</p>
            )}
            <Button variant="outline" asChild>
              <Link href="/sepet">
                Sepete Git {itemCount > 0 ? `(${itemCount})` : ""}
              </Link>
            </Button>
          </div>
        </>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-6 py-4 font-semibold text-slate-700">Özellikler</th>
              {plans.map((p) => (
                <th key={p.id} className="px-6 py-4 text-center">
                  <span className="text-orange-500 font-bold text-xs">{p.name_tr}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map((f) => (
              <tr key={f.name} className="border-b border-slate-100 last:border-0">
                <td className="px-6 py-3 text-xs text-slate-600">{f.name}</td>
                {[f.asistan, f.asistanPlus, f.asistanPro].map((val, i) => (
                  <td key={i} className="px-6 py-3 text-center">
                    {typeof val === "boolean" ? (
                      val ? (
                        <Check className="h-4 w-4 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-4 w-4 text-red-400 mx-auto" />
                      )
                    ) : (
                      <span className="text-xs text-slate-600">{val}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
