export type ProductType =
  | "subscription"
  | "sms_package"
  | "whatsapp_package"
  | "user_package"

export type BillingPeriod = "monthly" | "yearly"

export type CatalogPlan = {
  id: string
  name_tr: string
  max_users: number
  monthly_price: number
  annual_price: number
  monthly_price_hint: string | null
  description_tr: string | null
  sms_included: number
  features: Record<string, unknown>
  sort_order: number
  is_active: boolean
  highlighted?: boolean
}

export type CatalogProduct = {
  id: string
  product_type: Exclude<ProductType, "subscription">
  title_tr: string
  price: number
  credits: number | null
  description_tr: string | null
  sort_order: number
  is_active: boolean
}

export type CartItem = {
  lineId: string
  type: ProductType
  productKey: string
  title: string
  unitPrice: number
  billing?: BillingPeriod
  quantity: number
}

export type CatalogResponse = {
  plans: CatalogPlan[]
  products: CatalogProduct[]
}
