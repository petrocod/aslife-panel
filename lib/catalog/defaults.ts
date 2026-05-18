import type { CatalogPlan, CatalogProduct } from "./types"

export const DEFAULT_PLANS: CatalogPlan[] = [
  {
    id: "asistan",
    name_tr: "ASİSTAN",
    max_users: 1,
    monthly_price: 750,
    annual_price: 7500,
    monthly_price_hint: "₺750,00",
    description_tr:
      "Tek kişilik küçük bir işletmenin günlük faaliyetlerini yönetmek için ideal!",
    sms_included: 250,
    features: { highlighted: false },
    sort_order: 1,
    is_active: true,
  },
  {
    id: "asistan_plus",
    name_tr: "ASİSTAN +",
    max_users: 3,
    monthly_price: 1500,
    annual_price: 15000,
    monthly_price_hint: "₺1.500,00",
    description_tr:
      "Günlük randevu operasyonlarını rahat yönetin ve kolayca büyütün!",
    sms_included: 750,
    features: { highlighted: true },
    sort_order: 2,
    is_active: true,
    highlighted: true,
  },
  {
    id: "asistan_pro",
    name_tr: "ASİSTAN PRO",
    max_users: 6,
    monthly_price: 2100,
    annual_price: 21000,
    monthly_price_hint: "₺2.100,00",
    description_tr:
      "Profesyonel bir işletme için gereken her şey limitsiz. Rekabette fark yaratın!",
    sms_included: 1500,
    features: { highlighted: false },
    sort_order: 3,
    is_active: true,
  },
]

export const DEFAULT_PRODUCTS: CatalogProduct[] = [
  { id: "sms_500", product_type: "sms_package", title_tr: "500 SMS Kredisi", price: 275, credits: 500, description_tr: null, sort_order: 1, is_active: true },
  { id: "sms_1000", product_type: "sms_package", title_tr: "1.000 SMS Kredisi", price: 500, credits: 1000, description_tr: null, sort_order: 2, is_active: true },
  { id: "sms_3000", product_type: "sms_package", title_tr: "3.000 SMS Kredisi", price: 1350, credits: 3000, description_tr: null, sort_order: 3, is_active: true },
  { id: "wp_500", product_type: "whatsapp_package", title_tr: "500 WhatsApp Kredisi", price: 275, credits: 500, description_tr: null, sort_order: 1, is_active: true },
  { id: "wp_1000", product_type: "whatsapp_package", title_tr: "1.000 WhatsApp Kredisi", price: 500, credits: 1000, description_tr: null, sort_order: 2, is_active: true },
  { id: "wp_3000", product_type: "whatsapp_package", title_tr: "3.000 WhatsApp Kredisi", price: 1350, credits: 3000, description_tr: null, sort_order: 3, is_active: true },
  { id: "user_1", product_type: "user_package", title_tr: "1 Ek Kullanıcı", price: 2592, credits: null, description_tr: "Aylık", sort_order: 1, is_active: true },
  { id: "user_2", product_type: "user_package", title_tr: "2 Ek Kullanıcı", price: 5184, credits: null, description_tr: "Aylık", sort_order: 2, is_active: true },
]

export function formatTry(amount: number): string {
  return `₺${amount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function planUnitPrice(plan: CatalogPlan, billing: "monthly" | "yearly"): number {
  return billing === "yearly" ? plan.annual_price : plan.monthly_price
}
