"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabaseData as supabase } from "@/lib/supabase-data"
import { useCompany, DEMO_COMPANY_ID } from "@/hooks/useCompany"

export default function YeniUrunPage() {
  const router = useRouter()
  const { companyId } = useCompany()
  const cid = companyId || DEMO_COMPANY_ID

  const [name, setName] = useState("")
  const [category, setCategory] = useState("genel")
  const [brand, setBrand] = useState("")
  const [barcode, setBarcode] = useState("")
  const [price, setPrice] = useState("")
  const [costPrice, setCostPrice] = useState("")
  const [vatRate, setVatRate] = useState("20")
  const [stock, setStock] = useState("0")
  const [minStock, setMinStock] = useState("5")
  const [unit, setUnit] = useState("adet")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleSave() {
    if (!name.trim()) { setError("Ürün adı zorunludur."); return }
    if (!price || Number(price) <= 0) { setError("Fiyat giriniz."); return }
    setError(""); setSaving(true)

    const { error: sbError } = await supabase.from("products").insert({
      company_id: cid,
      name: name.trim(),
      category: category.trim() || "genel",
      brand: brand.trim() || null,
      barcode: barcode.trim() || null,
      price: Number(price),
      cost_price: Number(costPrice) || 0,
      vat_rate: Number(vatRate) || 20,
      stock: Number(stock) || 0,
      min_stock: Number(minStock) || 5,
      unit: unit.trim() || "adet",
      is_active: true,
    })

    setSaving(false)
    if (sbError) { setError(sbError.message); return }
    router.push("/urunler")
    router.refresh()
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Yeni Ürün</h1>
          <p className="text-sm text-slate-500">Ürün bilgilerini doldurun ve kaydedin.</p>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Ürün Adı *</Label>
            <Input className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} placeholder="Keratin Şampuan 300ml" />
          </div>
          <div>
            <Label>Kategori</Label>
            <Input className="mt-1.5" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="saç bakım" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Marka</Label>
            <Input className="mt-1.5" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="ProCare" />
          </div>
          <div>
            <Label>Barkod</Label>
            <Input className="mt-1.5" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="8691234567890" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Satış Fiyatı (₺) *</Label>
            <Input className="mt-1.5" type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div>
            <Label>Maliyet Fiyatı (₺)</Label>
            <Input className="mt-1.5" type="number" min={0} step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
          </div>
          <div>
            <Label>KDV (%)</Label>
            <Input className="mt-1.5" type="number" min={0} value={vatRate} onChange={(e) => setVatRate(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Stok Miktarı</Label>
            <Input className="mt-1.5" type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} />
          </div>
          <div>
            <Label>Minimum Stok</Label>
            <Input className="mt-1.5" type="number" min={0} value={minStock} onChange={(e) => setMinStock(e.target.value)} />
          </div>
          <div>
            <Label>Birim</Label>
            <Input className="mt-1.5" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="adet" />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={() => router.back()}>Vazgeç</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Kaydet
        </Button>
      </div>
    </div>
  )
}
