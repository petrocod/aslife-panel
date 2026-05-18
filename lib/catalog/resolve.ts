import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { DEFAULT_PLANS, DEFAULT_PRODUCTS } from "./defaults"
import type { CatalogPlan, CatalogProduct, CatalogResponse } from "./types"

function mapPlan(row: Record<string, unknown>): CatalogPlan {
  const features = (row.features as Record<string, unknown>) || {}
  return {
    id: String(row.id),
    name_tr: String(row.name_tr || ""),
    max_users: Number(row.max_users) || 1,
    monthly_price: Number(row.monthly_price) || 0,
    annual_price: Number(row.annual_price) || 0,
    monthly_price_hint: row.monthly_price_hint ? String(row.monthly_price_hint) : null,
    description_tr: row.description_tr ? String(row.description_tr) : null,
    sms_included: Number(row.sms_included) || Number((features as { sms_included?: number }).sms_included) || 0,
    features,
    sort_order: Number(row.sort_order) || 0,
    is_active: row.is_active !== false,
    highlighted: Boolean((features as { highlighted?: boolean }).highlighted),
  }
}

function mapProduct(row: Record<string, unknown>): CatalogProduct {
  return {
    id: String(row.id),
    product_type: row.product_type as CatalogProduct["product_type"],
    title_tr: String(row.title_tr || ""),
    price: Number(row.price) || 0,
    credits: row.credits != null ? Number(row.credits) : null,
    description_tr: row.description_tr ? String(row.description_tr) : null,
    sort_order: Number(row.sort_order) || 0,
    is_active: row.is_active !== false,
  }
}

export async function fetchCatalog(activeOnly = true): Promise<CatalogResponse> {
  const supabase = getSupabaseAdmin()

  let plansQuery = supabase
    .from("subscription_plans")
    .select(
      "id, name_tr, max_users, monthly_price, annual_price, monthly_price_hint, description_tr, features, sort_order, is_active, sms_included"
    )
    .order("sort_order", { ascending: true })

  if (activeOnly) {
    plansQuery = plansQuery.eq("is_active", true)
  }

  const { data: planRows, error: planErr } = await plansQuery

  let productsQuery = supabase
    .from("sellable_products")
    .select("id, product_type, title_tr, price, credits, description_tr, sort_order, is_active")
    .order("product_type")
    .order("sort_order", { ascending: true })

  if (activeOnly) {
    productsQuery = productsQuery.eq("is_active", true)
  }

  const { data: productRows, error: productErr } = await productsQuery

  const plans =
    !planErr && planRows?.length
      ? planRows.map((r) => mapPlan(r as Record<string, unknown>))
      : DEFAULT_PLANS

  const products =
    !productErr && productRows?.length
      ? productRows.map((r) => mapProduct(r as Record<string, unknown>))
      : DEFAULT_PRODUCTS.filter((p) => (activeOnly ? p.is_active : true))

  return { plans, products }
}

export async function findPlanPrice(planId: string, billing: "monthly" | "yearly"): Promise<number | null> {
  const { plans } = await fetchCatalog(false)
  const plan = plans.find((p) => p.id === planId)
  if (!plan) return null
  return billing === "yearly" ? plan.annual_price : plan.monthly_price
}

export async function findProductPrice(productId: string): Promise<{ price: number; title: string; type: CatalogProduct["product_type"] } | null> {
  const { products } = await fetchCatalog(false)
  const product = products.find((p) => p.id === productId)
  if (!product) return null
  return { price: product.price, title: product.title_tr, type: product.product_type }
}
