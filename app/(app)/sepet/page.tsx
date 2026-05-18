"use client"

import { Suspense, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useCart } from "@/contexts/CartContext"
import { formatTry } from "@/lib/catalog/defaults"
import { Minus, Plus, ShoppingCart, Trash2, ArrowLeft } from "lucide-react"

function typeLabel(type: string, billing?: string) {
  if (type === "subscription") {
    return billing === "yearly" ? "Yıllık abonelik" : "Aylık abonelik"
  }
  if (type === "sms_package") return "SMS paketi"
  if (type === "whatsapp_package") return "WhatsApp paketi"
  return "Kullanıcı paketi"
}

function SepetContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const paymentSuccess = searchParams.get("payment") === "success"
  const { items, subtotal, vatAmount, total, itemCount, removeItem, updateQuantity, clearCart } =
    useCart()

  useEffect(() => {
    if (searchParams.get("payment") === "success" && searchParams.get("cleared") === "1") {
      clearCart()
    }
  }, [searchParams, clearCart])

  if (itemCount === 0) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center space-y-6">
        {paymentSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg px-4 py-3">
            Ödemeniz başarıyla alındı. Teşekkür ederiz!
          </div>
        )}
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
          <ShoppingCart className="h-8 w-8 text-slate-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Sepetiniz boş</h1>
          <p className="text-sm text-slate-500 mt-2">
            Plan veya ek paket seçerek sepete ekleyebilirsiniz.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild variant="outline">
            <Link href="/hesabim/plan-sec">Plan Seç</Link>
          </Button>
          <Button asChild className="bg-orange-500 hover:bg-orange-600">
            <Link href="/hesabim/ek-paketler">Ek Paketler</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {paymentSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg px-4 py-3">
          Ödemeniz başarıyla alındı. Teşekkür ederiz!
        </div>
      )}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sepet</h1>
          <p className="text-sm text-slate-500">{itemCount} ürün</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 divide-y">
        {items.map((item) => (
          <div key={item.lineId} className="p-4 flex gap-4 items-start">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800">{item.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{typeLabel(item.type, item.billing)}</p>
              <p className="text-sm font-medium text-orange-600 mt-1">
                {formatTry(item.unitPrice)}
                {item.type !== "subscription" && item.quantity > 1 ? ` × ${item.quantity}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {item.type !== "subscription" && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity(item.lineId, item.quantity - 1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center text-sm">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity(item.lineId, item.quantity + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500"
                onClick={() => removeItem(item.lineId)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2">
        <div className="flex justify-between text-sm text-slate-600">
          <span>Ara Toplam</span>
          <span>{formatTry(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-slate-600">
          <span>KDV (%20)</span>
          <span>{formatTry(vatAmount)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold text-slate-800 border-t border-slate-100 pt-2">
          <span>Toplam</span>
          <span>{formatTry(total)}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="outline" onClick={clearCart} className="sm:flex-1">
          Sepeti Temizle
        </Button>
        <Button
          className="sm:flex-[2] bg-orange-500 hover:bg-orange-600"
          onClick={() => router.push("/hesabim/odeme?source=cart")}
        >
          Ödemeye Geç
        </Button>
      </div>
    </div>
  )
}

export default function SepetPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20 text-slate-400">Yükleniyor…</div>}>
      <SepetContent />
    </Suspense>
  )
}