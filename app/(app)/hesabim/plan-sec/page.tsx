"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Check, X, ShoppingCart, Tag, AlertCircle } from "lucide-react"
import { useSubscription } from "@/hooks/useSubscription"
import { cn } from "@/lib/utils"

const plans = [
  {
    id: "asistan" as const,
    name: "ASİSTAN",
    price: "₺750,00",
    priceNum: 750,
    yearlyPrice: "Yılda ₺9.000,00 + %20 KDV olarak faturalandırılacaktır.",
    vat: "%20 KDV",
    users: "Maks. 1 Kullanıcı",
    description: "Tek kişilik küçük bir işletmenin günlük faaliyetlerini yönetmek için ideal!",
    sms: "Ücretsiz 250 SMS dahil",
    smsCount: "1 Kullanıcı, 250 SMS",
  },
  {
    id: "asistan_plus" as const,
    name: "ASİSTAN +",
    price: "₺1.500,00",
    priceNum: 1500,
    yearlyPrice: "Yılda ₺18.000,00 + %20 KDV olarak faturalandırılacaktır.",
    vat: "%20 KDV",
    users: "Maks. 3 Kullanıcı",
    description: "Günlük randevu operasyonlarını rahat yönetin ve kolayca büyütün!",
    sms: "Ücretsiz 750 SMS dahil",
    smsCount: "3 Kullanıcı, 750 SMS",
    highlighted: true,
  },
  {
    id: "asistan_pro" as const,
    name: "ASİSTAN PRO",
    price: "₺2.100,00",
    priceNum: 2100,
    yearlyPrice: "Yılda ₺25.200,00 + %20 KDV olarak faturalandırılacaktır.",
    vat: "%20 KDV",
    users: "Maks. 6 Kullanıcı",
    description: "Profesyonel bir işletme için gereken her şey limitsiz. Rekabette fark yaratın!",
    sms: "Ücretsiz 1500 SMS dahil",
    smsCount: "6 Kullanıcı, 1500 SMS",
  },
]

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

function formatCurrency(num: number) {
  return `₺${num.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function PlanSecPage() {
  const [billing, setBilling] = useState<"yearly" | "monthly">("yearly")
  const { planId, planName, loading: subLoading } = useSubscription()
  const router = useRouter()

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [couponCode, setCouponCode] = useState("")
  const [couponError, setCouponError] = useState<string | null>(null)

  const selectedPlan = plans.find((p) => p.id === selectedPlanId)

  const handleCardClick = (planIdValue: string, isCurrent: boolean) => {
    if (isCurrent) return
    setSelectedPlanId((prev) => (prev === planIdValue ? null : planIdValue))
  }

  const handleOpenDialog = () => {
    setCouponCode("")
    setCouponError(null)
    setDialogOpen(true)
  }

  const handleApplyCoupon = () => {
    if (couponCode.trim()) {
      setCouponError("Geçersiz kupon")
    }
  }

  const handleProceedToPayment = () => {
    if (!selectedPlanId) return
    const params = new URLSearchParams({
      type: "subscription",
      planId: selectedPlanId,
    })
    if (couponCode.trim()) params.set("coupon", couponCode.trim())
    router.push(`/hesabim/odeme?${params.toString()}`)
  }

  const planPrice = selectedPlan?.priceNum ?? 0
  const kdvAmount = planPrice * 0.2
  const totalAmount = planPrice + kdvAmount

  return (
    <div className="p-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Plan seç</h2>
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBilling("yearly")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${billing === "yearly" ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-600"}`}
            >
              Yıllık Abonelik
            </button>
            <button
              onClick={() => setBilling("monthly")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${billing === "monthly" ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-600"}`}
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
          <li><strong>Kullanıcı sayısı</strong> uygulamada kullanılacak olan ve ekleyebileceğiniz maximum kişi sayısını ifade eder</li>
          <li>Yıllık Paketlerde faturalama <strong>Yıllık</strong> olarak Aylık Paketlerde ise <strong>Aylık</strong> olarak yapılmaktadır.</li>
        </ul>
      </div>

      {/* Plan cards */}
      {!subLoading && planId && (
        <p className="text-center text-sm text-slate-600 mb-4">
          Mevcut planınız: <strong className="text-slate-800">{planName}</strong> — yükseltmek için aşağıdan seçim yapabilirsiniz.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {plans.map((plan) => {
          const isCurrent = planId === plan.id
          const isSelected = selectedPlanId === plan.id
          return (
            <div
              key={plan.id}
              onClick={() => handleCardClick(plan.id, isCurrent)}
              className={cn(
                "relative rounded-xl border-2 p-6 transition-all duration-200",
                isCurrent
                  ? "ring-2 ring-emerald-500 ring-offset-2 border-emerald-400/80 cursor-default opacity-80"
                  : "cursor-pointer hover:shadow-lg",
                !isCurrent && isSelected
                  ? "border-orange-500 shadow-xl scale-[1.02]"
                  : !isCurrent && plan.highlighted
                    ? "border-orange-400 shadow-lg hover:border-orange-500"
                    : !isCurrent
                      ? "border-slate-200 hover:border-orange-200"
                      : "",
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
              {plan.highlighted && !isSelected && !isCurrent && (
                <div className="bg-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-full w-fit mb-3">
                  EN POPÜLER
                </div>
              )}
              <p className="text-xs font-bold text-orange-500 mb-1">{plan.name}</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-3xl font-bold text-slate-800">{plan.price}</span>
                <span className="text-xs text-slate-500 mb-1">/ ay</span>
              </div>
              <p className="text-xs text-slate-500 mb-1">+ {plan.vat}</p>
              <p className="text-sm font-medium text-slate-700 mb-2">{plan.users}</p>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">{plan.description}</p>
              <p className="text-xs font-medium text-slate-700 mb-1">{plan.sms}</p>
              <p className="text-xs text-slate-500 mb-4">{plan.smsCount}</p>
              <Button
                className={cn(
                  "w-full transition-all",
                  isSelected && "bg-orange-500 hover:bg-orange-600 text-white",
                )}
                variant={isSelected ? "default" : plan.highlighted ? "default" : "outline"}
                disabled={isCurrent}
                onClick={(e) => {
                  e.stopPropagation()
                  handleCardClick(plan.id, isCurrent)
                }}
              >
                {isCurrent ? "Mevcut Plan" : isSelected ? "✓ Seçildi" : "Seç"}
              </Button>
              <p className="text-xs text-slate-400 mt-3 text-center">{plan.yearlyPrice}</p>
            </div>
          )
        })}
      </div>

      {/* Buy button */}
      <div className="flex justify-center mb-10">
        <Button
          size="lg"
          disabled={!selectedPlanId}
          onClick={handleOpenDialog}
          className={cn(
            "px-10 py-3 text-base font-semibold transition-all",
            selectedPlanId
              ? "bg-orange-500 hover:bg-orange-600 text-white shadow-lg"
              : "bg-slate-200 text-slate-400 cursor-not-allowed",
          )}
        >
          <ShoppingCart className="h-5 w-5 mr-2" />
          Satın Al
        </Button>
      </div>

      {/* Payment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-800">Ödeme Özeti</DialogTitle>
          </DialogHeader>

          {selectedPlan && (
            <div className="space-y-5">
              {/* Plan summary */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-orange-600">{selectedPlan.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{selectedPlan.users} · {billing === "yearly" ? "Yıllık" : "Aylık"}</p>
                  </div>
                  <p className="text-lg font-bold text-slate-800">{selectedPlan.price}<span className="text-xs font-normal text-slate-500"> /ay</span></p>
                </div>
              </div>

              {/* Coupon field */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  <Tag className="h-3.5 w-3.5 inline mr-1.5 text-slate-400" />
                  Kupon Kodu
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Kupon kodunuzu girin"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value)
                      setCouponError(null)
                    }}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={handleApplyCoupon}
                    disabled={!couponCode.trim()}
                    className="shrink-0"
                  >
                    Uygula
                  </Button>
                </div>
                {couponError && (
                  <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {couponError}
                  </p>
                )}
              </div>

              {/* Price breakdown */}
              <div className="border-t border-slate-200 pt-4 space-y-2">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Plan Ücreti</span>
                  <span>{formatCurrency(planPrice)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600">
                  <span>KDV (%20)</span>
                  <span>{formatCurrency(kdvAmount)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-slate-800 border-t border-slate-200 pt-2">
                  <span>Toplam</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button
              onClick={handleProceedToPayment}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 text-base"
              size="lg"
            >
              Ödemeye Geç
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Features table */}
      <div className="text-center mb-4">
        <button className="text-sm text-slate-600 border border-slate-200 rounded-full px-4 py-2 hover:bg-slate-50">
          Tüm özellikleri gizle
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-6 py-4 font-semibold text-slate-700">Özellikler</th>
              {plans.map(p => (
                <th key={p.id} className="px-6 py-4 text-center">
                  <span className="text-orange-500 font-bold text-xs">{p.name}</span>
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
                      val
                        ? <Check className="h-4 w-4 text-green-500 mx-auto" />
                        : <X className="h-4 w-4 text-red-400 mx-auto" />
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
