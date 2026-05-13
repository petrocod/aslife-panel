"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { format, parseISO } from "date-fns"
import { ArrowLeft, Loader2, Trash2, Package, TrendingDown, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { supabaseData as supabase } from "@/lib/supabase-data"
import { useCompany, DEMO_COMPANY_ID } from "@/hooks/useCompany"

type Product = {
  id: string; name: string; category: string; brand: string | null
  barcode: string | null; price: number; cost_price: number
  vat_rate: number; stock: number; min_stock: number
  unit: string; is_active: boolean; created_at: string
}

type SaleItem = {
  id: string; quantity: number; unit_price: number; total_price: number
  product_sales: { sold_at: string; payment_method: string; customer_id: string | null } | null
}

export default function UrunDetailPage() {
  const router = useRouter()
  const { id } = useParams() as { id: string }
  const { companyId } = useCompany()
  const cid = companyId || DEMO_COMPANY_ID

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [sales, setSales] = useState<SaleItem[]>([])

  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [brand, setBrand] = useState("")
  const [barcode, setBarcode] = useState("")
  const [price, setPrice] = useState("")
  const [costPrice, setCostPrice] = useState("")
  const [vatRate, setVatRate] = useState("")
  const [stock, setStock] = useState("")
  const [minStock, setMinStock] = useState("")
  const [unit, setUnit] = useState("")

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .eq("company_id", cid)
        .single()
      if (data) {
        setProduct(data as Product)
        setName(data.name)
        setCategory(data.category || "")
        setBrand(data.brand || "")
        setBarcode(data.barcode || "")
        setPrice(String(data.price))
        setCostPrice(String(data.cost_price || ""))
        setVatRate(String(data.vat_rate))
        setStock(String(data.stock))
        setMinStock(String(data.min_stock))
        setUnit(data.unit || "adet")
      }
      setLoading(false)
    }
    load()
  }, [id, cid])

  const fetchSales = useCallback(async () => {
    const { data } = await supabase
      .from("product_sale_items")
      .select("id, quantity, unit_price, total_price, product_sales(sold_at, payment_method, customer_id)")
      .eq("product_id", id)
      .order("id", { ascending: false })
    setSales((data as unknown as SaleItem[]) || [])
  }, [id])

  useEffect(() => { fetchSales() }, [fetchSales])

  async function handleSave() {
    if (!name.trim()) { setError("Ürün adı zorunludur."); return }
    setError(""); setSaving(true)
    const { error: e } = await supabase.from("products").update({
      name: name.trim(),
      category: category.trim() || "genel",
      brand: brand.trim() || null,
      barcode: barcode.trim() || null,
      price: Number(price) || 0,
      cost_price: Number(costPrice) || 0,
      vat_rate: Number(vatRate) || 20,
      stock: Number(stock) || 0,
      min_stock: Number(minStock) || 5,
      unit: unit.trim() || "adet",
      updated_at: new Date().toISOString(),
    }).eq("id", id)
    setSaving(false)
    if (e) { setError(e.message); return }
    setSuccess("Ürün güncellendi.")
    setTimeout(() => setSuccess(""), 3000)
  }

  async function handleDelete() {
    if (!confirm("Bu ürünü silmek istediğinizden emin misiniz?")) return
    await supabase.from("products").delete().eq("id", id)
    router.push("/urunler")
    router.refresh()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  )
  if (!product) return <div className="p-6 text-slate-500">Ürün bulunamadı.</div>

  const totalSold = sales.reduce((s, i) => s + i.quantity, 0)
  const totalRevenue = sales.reduce((s, i) => s + Number(i.total_price), 0)
  const profitPerUnit = Number(product.price) - Number(product.cost_price || 0)

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-slate-800">{product.name}</h1>
            <p className="text-sm text-slate-500">{product.category} {product.brand ? `· ${product.brand}` : ""}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleDelete}>
          <Trash2 className="h-4 w-4 mr-1" /> Sil
        </Button>
      </div>

      {/* Stats */}
      <div className="flex gap-3 mb-6">
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 min-w-[120px]">
          <p className="text-lg font-bold text-blue-700 tabular-nums">{product.stock}</p>
          <p className="text-xs text-blue-600">Mevcut Stok</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-2.5 min-w-[120px]">
          <p className="text-lg font-bold text-green-700 tabular-nums">{totalSold}</p>
          <p className="text-xs text-green-600">Toplam Satış</p>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-2.5 min-w-[120px]">
          <p className="text-lg font-bold text-purple-700 tabular-nums">₺{totalRevenue.toFixed(2)}</p>
          <p className="text-xs text-purple-600">Toplam Gelir</p>
        </div>
        {profitPerUnit > 0 && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 min-w-[120px]">
            <p className="text-lg font-bold text-emerald-700 tabular-nums flex items-center gap-1">
              <TrendingUp className="h-4 w-4" /> ₺{profitPerUnit.toFixed(2)}
            </p>
            <p className="text-xs text-emerald-600">Birim Kâr</p>
          </div>
        )}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{success}</div>}

      {/* Edit form */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Ürün Adı *</Label><Input className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Kategori</Label><Input className="mt-1.5" value={category} onChange={(e) => setCategory(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Marka</Label><Input className="mt-1.5" value={brand} onChange={(e) => setBrand(e.target.value)} /></div>
          <div><Label>Barkod</Label><Input className="mt-1.5" value={barcode} onChange={(e) => setBarcode(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Satış Fiyatı (₺)</Label><Input className="mt-1.5" type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
          <div><Label>Maliyet (₺)</Label><Input className="mt-1.5" type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} /></div>
          <div><Label>KDV (%)</Label><Input className="mt-1.5" type="number" value={vatRate} onChange={(e) => setVatRate(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Stok</Label><Input className="mt-1.5" type="number" value={stock} onChange={(e) => setStock(e.target.value)} /></div>
          <div><Label>Min. Stok</Label><Input className="mt-1.5" type="number" value={minStock} onChange={(e) => setMinStock(e.target.value)} /></div>
          <div><Label>Birim</Label><Input className="mt-1.5" value={unit} onChange={(e) => setUnit(e.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => router.back()}>Vazgeç</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Kaydet
          </Button>
        </div>
      </div>

      {/* Sales history */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-700">Satış Geçmişi</h3>
        </div>
        {sales.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">Henüz satış kaydı yok.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-2 text-xs text-slate-500">Tarih</th>
                <th className="text-center px-5 py-2 text-xs text-slate-500">Adet</th>
                <th className="text-right px-5 py-2 text-xs text-slate-500">Tutar</th>
                <th className="text-right px-5 py-2 text-xs text-slate-500">Ödeme</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-5 py-2.5 text-sm text-slate-700">
                    {s.product_sales?.sold_at ? format(parseISO(s.product_sales.sold_at), "dd.MM.yyyy HH:mm") : "—"}
                  </td>
                  <td className="px-5 py-2.5 text-sm text-center tabular-nums">{s.quantity}</td>
                  <td className="px-5 py-2.5 text-sm text-right font-medium tabular-nums">₺{Number(s.total_price).toFixed(2)}</td>
                  <td className="px-5 py-2.5 text-sm text-right text-slate-500 capitalize">{s.product_sales?.payment_method || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
