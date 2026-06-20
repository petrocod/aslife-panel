import type { SupabaseClient } from "@supabase/supabase-js"
import type { CartItem } from "@/lib/catalog/types"
import { fetchCatalog } from "@/lib/catalog/resolve"

type CartLineMeta = {
  type: string
  productKey: string
  billing?: string
  quantity?: number
}

export async function fulfillCartItems(
  supabase: SupabaseClient,
  companyId: string,
  items: CartLineMeta[]
) {
  const { products } = await fetchCatalog(false)

  for (const item of items) {
    if (item.type === "subscription" && item.productKey) {
      const periodMs =
        item.billing === "yearly" ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000
      await supabase
        .from("company_subscriptions")
        .update({
          plan_id: item.productKey,
          status: "active",
          trial_ends_at: null,
          current_period_end: new Date(Date.now() + periodMs).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", companyId)
    } else if (item.type === "sms_package" && item.productKey) {
      const product = products.find((p) => p.id === item.productKey)
      const credits = (product?.credits || 500) * (item.quantity || 1)
      await supabase.from("sms_packages").insert({
        company_id: companyId,
        name: `SMS Paketi (${credits} kredi)`,
        total_sms: credits,
        used_sms: 0,
        purchased_at: new Date().toISOString(),
      })
    } else if (item.type === "whatsapp_package" && item.productKey) {
      const product = products.find((p) => p.id === item.productKey)
      const credits = (product?.credits || 500) * (item.quantity || 1)
      await supabase.from("whatsapp_packages").insert({
        company_id: companyId,
        name: `WhatsApp Paketi (${credits} kredi)`,
        total_sms: credits,
        used_sms: 0,
        purchased_at: new Date().toISOString(),
      })
    }
  }
}

export function cartItemsFromMetadata(meta: unknown): CartLineMeta[] {
  if (!meta || typeof meta !== "object") return []
  const m = meta as { items?: CartLineMeta[]; planId?: string; packageId?: string; billing?: string }
  if (Array.isArray(m.items) && m.items.length > 0) {
    return m.items
  }
  if (m.planId) {
    return [{ type: "subscription", productKey: m.planId, billing: m.billing }]
  }
  if (m.packageId) {
    const txnType = (meta as { txnType?: string }).txnType
    const type = txnType || "sms_package"
    return [{ type, productKey: m.packageId, quantity: 1 }]
  }
  return []
}

export function describeCartItems(items: CartLineMeta[]): string {
  return items.map((i) => `${i.type}:${i.productKey}`).join(", ")
}

export type { CartItem }
