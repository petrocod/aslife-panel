"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MessageSquare, Phone, Users, ShoppingCart, Loader2 } from "lucide-react"
import { useCatalog } from "@/hooks/useCatalog"
import { useCart } from "@/contexts/CartContext"
import { formatTry } from "@/lib/catalog/defaults"
import type { CatalogProduct } from "@/lib/catalog/types"

function perUnitLabel(product: CatalogProduct) {
  if (!product.credits) return product.description_tr || ""
  const unit = product.product_type === "whatsapp_package" ? "mesaj" : "SMS"
  const perThousand = ((product.price / product.credits) * 1000).toFixed(0)
  return `${perThousand} kuruş / ${unit}`
}

function PackageGrid({
  products,
  color,
  icon: Icon,
  onAdd,
}: {
  products: CatalogProduct[]
  color: "blue" | "green" | "purple"
  icon: typeof Phone
  onAdd: (p: CatalogProduct) => void
}) {
  const styles = {
    blue: {
      border: "border-blue-100 hover:border-blue-300",
      iconBg: "bg-blue-50",
      icon: "text-blue-600",
      price: "text-blue-700",
      btn: "bg-blue-600 hover:bg-blue-700",
    },
    green: {
      border: "border-green-100 hover:border-green-300",
      iconBg: "bg-green-50",
      icon: "text-green-600",
      price: "text-green-700",
      btn: "bg-green-600 hover:bg-green-700",
    },
    purple: {
      border: "border-purple-100 hover:border-purple-300",
      iconBg: "bg-purple-50",
      icon: "text-purple-600",
      price: "text-purple-700",
      btn: "bg-purple-600 hover:bg-purple-700",
    },
  }[color]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {products.map((pkg) => (
        <div
          key={pkg.id}
          className={`bg-white border-2 ${styles.border} rounded-xl p-5 text-center transition-colors`}
        >
          <div
            className={`w-12 h-12 ${styles.iconBg} rounded-full flex items-center justify-center mx-auto mb-3`}
          >
            <Icon className={`w-5 h-5 ${styles.icon}`} />
          </div>
          <p className="text-sm font-semibold text-slate-800 mb-1">{pkg.title_tr}</p>
          <p className={`text-lg font-bold ${styles.price} mb-1`}>{formatTry(pkg.price)}</p>
          <p className="text-[11px] text-slate-400 mb-4">{perUnitLabel(pkg)}</p>
          <Button size="sm" className={`w-full ${styles.btn}`} onClick={() => onAdd(pkg)}>
            <ShoppingCart className="h-3.5 w-3.5 mr-1" />
            Sepete Ekle
          </Button>
        </div>
      ))}
    </div>
  )
}

export default function EkPaketlerPage() {
  const { catalog, loading } = useCatalog()
  const { addItem, itemCount } = useCart()

  const sms = catalog.products.filter((p) => p.product_type === "sms_package")
  const whatsapp = catalog.products.filter((p) => p.product_type === "whatsapp_package")
  const users = catalog.products.filter((p) => p.product_type === "user_package")

  function handleAdd(product: CatalogProduct) {
    addItem({
      type: product.product_type,
      productKey: product.id,
      title: product.title_tr,
      unitPrice: product.price,
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">Paketleri sepete ekleyip birlikte ödeyebilirsiniz.</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/sepet">Sepete Git {itemCount > 0 ? `(${itemCount})` : ""}</Link>
        </Button>
      </div>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Phone className="w-4 h-4 text-blue-600" />
          </div>
          <h2 className="text-base font-semibold text-slate-800">SMS Paketleri</h2>
        </div>
        <PackageGrid products={sms} color="blue" icon={Phone} onAdd={handleAdd} />
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-green-600" />
          </div>
          <h2 className="text-base font-semibold text-slate-800">WhatsApp Paketleri</h2>
        </div>
        <PackageGrid products={whatsapp} color="green" icon={MessageSquare} onAdd={handleAdd} />
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-purple-600" />
            </div>
            <h2 className="text-base font-semibold text-slate-800">Kullanıcı Paketleri</h2>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/hesabim/plan-sec">Plan Değiştir</Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {users.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-white border-2 border-purple-100 rounded-xl p-5 text-center hover:border-purple-300 transition-colors"
            >
              <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-sm font-semibold text-slate-800 mb-1">{pkg.title_tr}</p>
              <p className="text-lg font-bold text-purple-700 mb-1">{formatTry(pkg.price)}</p>
              <p className="text-[11px] text-slate-400 mb-4">{pkg.description_tr || "Aylık"}</p>
              <Button
                size="sm"
                className="w-full bg-purple-600 hover:bg-purple-700"
                onClick={() => handleAdd(pkg)}
              >
                <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                Sepete Ekle
              </Button>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Mevcut planınızı değiştirmek için{" "}
          <Link href="/hesabim/plan-sec" className="text-blue-600 hover:underline">
            Plan Seçimi
          </Link>{" "}
          sayfasını ziyaret edin.
        </p>
      </section>
    </div>
  )
}
