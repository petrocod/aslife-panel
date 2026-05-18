"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Loader2, Save, Tags } from "lucide-react"
import type { CatalogPlan, CatalogProduct } from "@/lib/catalog/types"
import { formatTry } from "@/lib/catalog/defaults"

export default function AdminPricingPage() {
  const [plans, setPlans] = useState<CatalogPlan[]>([])
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch("/api/admin/pricing", {
      headers: { Authorization: `Bearer ${session?.access_token || ""}` },
    })
    const json = await res.json()
    if (res.ok) {
      setPlans(json.plans || [])
      setProducts(json.products || [])
    }
    setLoading(false)
  }

  async function savePlan(plan: CatalogPlan) {
    setSaving(`plan-${plan.id}`)
    setMessage(null)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch("/api/admin/pricing", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token || ""}`,
      },
      body: JSON.stringify({
        entity: "plan",
        id: plan.id,
        updates: {
          name_tr: plan.name_tr,
          monthly_price: plan.monthly_price,
          annual_price: plan.annual_price,
          max_users: plan.max_users,
          sms_included: plan.sms_included,
          description_tr: plan.description_tr,
          is_active: plan.is_active,
          highlighted: plan.highlighted,
        },
      }),
    })
    const json = await res.json()
    if (res.ok) {
      setPlans(json.plans || [])
      setMessage("Plan kaydedildi.")
    } else {
      setMessage(json.error || "Kayıt başarısız")
    }
    setSaving(null)
  }

  async function saveProduct(product: CatalogProduct) {
    setSaving(`product-${product.id}`)
    setMessage(null)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch("/api/admin/pricing", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token || ""}`,
      },
      body: JSON.stringify({
        entity: "product",
        id: product.id,
        updates: {
          title_tr: product.title_tr,
          price: product.price,
          credits: product.credits,
          description_tr: product.description_tr,
          is_active: product.is_active,
        },
      }),
    })
    const json = await res.json()
    if (res.ok) {
      setProducts(json.products || [])
      setMessage("Paket kaydedildi.")
    } else {
      setMessage(json.error || "Kayıt başarısız")
    }
    setSaving(null)
  }

  function updatePlan(id: string, patch: Partial<CatalogPlan>) {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  function updateProduct(id: string, patch: Partial<CatalogProduct>) {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  const productGroups = [
    { key: "sms_package", label: "SMS Paketleri" },
    { key: "whatsapp_package", label: "WhatsApp Paketleri" },
    { key: "user_package", label: "Kullanıcı Paketleri" },
  ] as const

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Tags className="h-6 w-6 text-orange-500" />
          Fiyatlandırma
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Abonelik planları ve satış paketlerinin fiyatlarını buradan güncelleyin.
        </p>
        {message && (
          <p className="text-sm text-emerald-600 mt-2">{message}</p>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Abonelik Planları</h2>
            </div>
            <div className="divide-y">
              {plans.map((plan) => (
                <div key={plan.id} className="p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold text-orange-600">{plan.id}</p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500">Aktif</span>
                      <Switch
                        checked={plan.is_active}
                        onCheckedChange={(v) => updatePlan(plan.id, { is_active: v })}
                      />
                      <span className="text-slate-500 ml-2">Öne çıkan</span>
                      <Switch
                        checked={!!plan.highlighted}
                        onCheckedChange={(v) => updatePlan(plan.id, { highlighted: v })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-500">Plan adı</label>
                      <Input
                        value={plan.name_tr}
                        onChange={(e) => updatePlan(plan.id, { name_tr: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Açıklama</label>
                      <Input
                        value={plan.description_tr || ""}
                        onChange={(e) => updatePlan(plan.id, { description_tr: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Aylık fiyat (₺)</label>
                      <Input
                        type="number"
                        value={plan.monthly_price}
                        onChange={(e) =>
                          updatePlan(plan.id, { monthly_price: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Yıllık fiyat (₺)</label>
                      <Input
                        type="number"
                        value={plan.annual_price}
                        onChange={(e) =>
                          updatePlan(plan.id, { annual_price: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Maks. kullanıcı</label>
                      <Input
                        type="number"
                        value={plan.max_users}
                        onChange={(e) =>
                          updatePlan(plan.id, { max_users: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Dahil SMS</label>
                      <Input
                        type="number"
                        value={plan.sms_included}
                        onChange={(e) =>
                          updatePlan(plan.id, { sms_included: Number(e.target.value) })
                        }
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">
                    Önizleme: {formatTry(plan.monthly_price)}/ay · {formatTry(plan.annual_price)}/yıl
                  </p>
                  <Button
                    size="sm"
                    onClick={() => savePlan(plan)}
                    disabled={saving === `plan-${plan.id}`}
                  >
                    {saving === `plan-${plan.id}` ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Save className="h-4 w-4 mr-1" />
                    )}
                    Kaydet
                  </Button>
                </div>
              ))}
            </div>
          </section>

          {productGroups.map((group) => (
            <section
              key={group.key}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800">{group.label}</h2>
              </div>
              <div className="divide-y">
                {products
                  .filter((p) => p.product_type === group.key)
                  .map((product) => (
                    <div key={product.id} className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="font-mono text-xs text-slate-500">{product.id}</p>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-slate-500">Aktif</span>
                          <Switch
                            checked={product.is_active}
                            onCheckedChange={(v) =>
                              updateProduct(product.id, { is_active: v })
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="text-xs text-slate-500">Başlık</label>
                          <Input
                            value={product.title_tr}
                            onChange={(e) =>
                              updateProduct(product.id, { title_tr: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">Fiyat (₺)</label>
                          <Input
                            type="number"
                            value={product.price}
                            onChange={(e) =>
                              updateProduct(product.id, { price: Number(e.target.value) })
                            }
                          />
                        </div>
                        {product.credits != null && (
                          <div>
                            <label className="text-xs text-slate-500">Kredi</label>
                            <Input
                              type="number"
                              value={product.credits}
                              onChange={(e) =>
                                updateProduct(product.id, {
                                  credits: Number(e.target.value),
                                })
                              }
                            />
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => saveProduct(product)}
                        disabled={saving === `product-${product.id}`}
                      >
                        {saving === `product-${product.id}` ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <Save className="h-4 w-4 mr-1" />
                        )}
                        Kaydet
                      </Button>
                    </div>
                  ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  )
}
