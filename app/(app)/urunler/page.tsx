"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Search, Loader2, Package, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { supabaseData as supabase } from "@/lib/supabase-data"
import { useCompany, DEMO_COMPANY_ID } from "@/hooks/useCompany"
import { recordIncomeFromProductSale } from "@/lib/finance/integration"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { PrintableDocumentDialog } from "@/components/documents/PrintableDocumentDialog"
import { usePrintableReceipt } from "@/hooks/usePrintableReceipt"
import { buildProductSaleBody, mapPaymentMethodLabel } from "@/lib/documents/receipt-types"

type Product = {
  id: string
  name: string
  category: string
  brand: string | null
  price: number
  cost_price: number
  stock: number
  min_stock: number
  is_active: boolean
}

const STOCK_FILTERS = [
  { id: "all", label: "Tümü" },
  { id: "in_stock", label: "Stokta" },
  { id: "low", label: "Düşük Stok" },
  { id: "out", label: "Tükendi" },
] as const

export default function UrunlerPage() {
  const router = useRouter()
  const { companyId } = useCompany()
  const cid = companyId || DEMO_COMPANY_ID

  const [search, setSearch] = useState("")
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [stockFilter, setStockFilter] = useState<string>("all")
  const [showSale, setShowSale] = useState<Product | null>(null)
  const [customers, setCustomers] = useState<{ id: string; full_name: string }[]>([])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from("products")
      .select("id, name, category, brand, price, cost_price, stock, min_stock, is_active")
      .eq("company_id", cid)
      .order("name")
    setProducts((data as Product[]) || [])
    setLoading(false)
  }, [cid])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  useEffect(() => {
    supabase
      .from("customers")
      .select("id, full_name")
      .eq("company_id", cid)
      .order("full_name")
      .then(({ data }) => setCustomers((data as { id: string; full_name: string }[]) || []))
  }, [cid])

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.brand || "").toLowerCase().includes(search.toLowerCase())
    let matchStock = true
    if (stockFilter === "in_stock") matchStock = p.stock > p.min_stock
    else if (stockFilter === "low") matchStock = p.stock > 0 && p.stock <= p.min_stock
    else if (stockFilter === "out") matchStock = p.stock <= 0
    return matchSearch && matchStock
  })

  const totalValue = products.reduce((s, p) => s + p.price * p.stock, 0)
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= p.min_stock).length
  const outOfStockCount = products.filter((p) => p.stock <= 0).length

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Stats */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold text-slate-800">Ürünler</h1>
          <Link href="/urunler/yeni">
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" /> Yeni Ürün
            </Button>
          </Link>
        </div>
        <div className="flex gap-3">
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 min-w-[130px]">
            <p className="text-lg font-bold text-blue-700">{products.length}</p>
            <p className="text-xs text-blue-600">Toplam Ürün</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-2.5 min-w-[130px]">
            <p className="text-lg font-bold text-green-700">₺{totalValue.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-green-600">Stok Değeri</p>
          </div>
          {lowStockCount > 0 && (
            <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-2.5 min-w-[130px]">
              <p className="text-lg font-bold text-orange-700">{lowStockCount}</p>
              <p className="text-xs text-orange-600">Düşük Stok</p>
            </div>
          )}
          {outOfStockCount > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 min-w-[130px]">
              <p className="text-lg font-bold text-red-700">{outOfStockCount}</p>
              <p className="text-xs text-red-600">Tükendi</p>
            </div>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Ürün veya marka ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {STOCK_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setStockFilter(f.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                stockFilter === f.id
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Ürün Adı</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Kategori</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Marka</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Fiyat</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Stok</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Durum</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500 text-sm">
                  {search || stockFilter !== "all" ? "Sonuç bulunamadı." : "Henüz ürün eklenmemiş."}
                </td></tr>
              ) : filtered.map((p) => {
                const isLow = p.stock > 0 && p.stock <= p.min_stock
                const isOut = p.stock <= 0
                return (
                  <tr
                    key={p.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/urunler/${p.id}`)}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                          <Package className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="text-sm font-medium text-slate-800">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-600 capitalize">{p.category}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-600">{p.brand || "—"}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-800 font-medium text-right tabular-nums">
                      ₺{Number(p.price).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={cn(
                        "text-sm font-medium tabular-nums",
                        isOut ? "text-red-600" : isLow ? "text-orange-600" : "text-slate-800"
                      )}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {isOut ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          <AlertTriangle className="h-3 w-3" /> Tükendi
                        </span>
                      ) : isLow ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                          <AlertTriangle className="h-3 w-3" /> Düşük
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Stokta
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={(e) => { e.stopPropagation(); setShowSale(p) }}
                        disabled={isOut}
                      >
                        Satış Yap
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-500">
            Toplam: {filtered.length} ürün
          </div>
        </div>
      </div>

      {/* Sale modal */}
      {showSale && (
        <SaleModal
          product={showSale}
          companyId={cid}
          customers={customers}
          onClose={() => setShowSale(null)}
          onSaved={() => { setShowSale(null); fetchProducts() }}
        />
      )}
    </div>
  )
}

function SaleModal({
  product, companyId, customers, onClose, onSaved,
}: {
  product: Product
  companyId: string
  customers: { id: string; full_name: string }[]
  onClose: () => void
  onSaved: () => void
}) {
  const [qty, setQty] = useState(1)
  const [discount, setDiscount] = useState(0)
  const [method, setMethod] = useState("cash")
  const [customerId, setCustomerId] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const { receiptOpen, setReceiptOpen, receiptPayload, openReceipt } = usePrintableReceipt()

  const unitPrice = Number(product.price)
  const total = Math.max(0, unitPrice * qty - discount)

  async function handleSave() {
    if (qty <= 0) { setError("Miktar 0'dan büyük olmalıdır."); return }
    if (qty > product.stock) { setError(`Stokta yalnızca ${product.stock} adet var.`); return }
    setError(""); setSaving(true)

    const { data: sale, error: e1 } = await supabase.from("product_sales").insert({
      company_id: companyId,
      customer_id: customerId || null,
      total_amount: total,
      discount,
      payment_method: method,
    }).select("id").single()

    if (e1 || !sale) { setError(e1?.message || "Satış kaydı başarısız."); setSaving(false); return }

    const { error: e2 } = await supabase.from("product_sale_items").insert({
      sale_id: sale.id,
      product_id: product.id,
      quantity: qty,
      unit_price: unitPrice,
      total_price: unitPrice * qty,
    })

    if (e2) { setError(e2.message); setSaving(false); return }

    await supabase.from("products").update({
      stock: product.stock - qty,
      updated_at: new Date().toISOString(),
    }).eq("id", product.id)

    await recordIncomeFromProductSale(supabase, {
      companyId,
      saleId: sale.id,
      amount: total,
      uiPaymentMethod: method,
      productName: product.name,
    })

    setSaving(false)
    const custName = customers.find((c) => c.id === customerId)?.full_name || ""
    onSaved()
    openReceipt({
      title: "Ürün Satış Makbuzu",
      subtitle: product.name,
      customerName: custName || undefined,
      referenceNo: sale.id.slice(0, 8).toUpperCase(),
      lineItems: [
        { label: "Ürün", value: product.name },
        { label: "Adet", value: String(qty) },
        { label: "Birim fiyat", value: `₺${unitPrice.toFixed(2)}` },
        ...(discount > 0 ? [{ label: "İndirim", value: `-₺${discount.toFixed(2)}` }] : []),
      ],
      totalAmount: `₺${total.toFixed(2)}`,
      paymentMethod: mapPaymentMethodLabel(method),
      defaultBody: buildProductSaleBody(
        custName,
        `${product.name} × ${qty} — Toplam ₺${total.toFixed(2)}`
      ),
    })
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] bg-white rounded-2xl shadow-2xl z-50 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-800">Ürün Satışı</h2>
          <p className="text-xs text-slate-500 mt-0.5">{product.name}</p>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded">{error}</p>}

          <div>
            <Label className="text-xs font-medium text-slate-600">Müşteri (isteğe bağlı)</Label>
            <Select value={customerId || "__none__"} onValueChange={(v) => setCustomerId(v === "__none__" ? "" : v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Müşteri seçin" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Müşteri yok —</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Miktar</label>
              <Input
                type="number"
                min={1}
                max={product.stock}
                className="mt-1"
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Stok: {product.stock}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Birim Fiyat</label>
              <div className="flex items-center border rounded-md px-3 h-9 mt-1 bg-slate-50">
                <span className="text-sm text-slate-700">₺{unitPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">İndirim (₺)</label>
            <Input
              type="number"
              min={0}
              className="mt-1"
              value={discount}
              onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">Ödeme yöntemi</label>
            <div className="flex gap-2 mt-1">
              {[
                { id: "cash", label: "Nakit" },
                { id: "card", label: "Kart" },
                { id: "transfer", label: "Havale" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-1",
                    method === m.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Ara toplam</span>
              <span className="font-medium tabular-nums">₺{(unitPrice * qty).toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm mt-1">
                <span className="text-slate-500">İndirim</span>
                <span className="font-medium text-orange-600 tabular-nums">-₺{discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold mt-2 pt-2 border-t border-slate-200">
              <span>Toplam</span>
              <span className="text-base tabular-nums">₺{total.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-200">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Vazgeç</Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Satışı Kaydet
          </Button>
        </div>
      </div>
      <PrintableDocumentDialog
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        companyId={companyId}
        payload={receiptPayload}
      />
    </>
  )
}
