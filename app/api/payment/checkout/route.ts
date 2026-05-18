import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createCheckoutForm, type CheckoutItem } from "@/lib/iyzico"
import { fetchCatalog, findPlanPrice, findProductPrice } from "@/lib/catalog/resolve"
import type { CartItem } from "@/lib/catalog/types"
import { verifyUserBearer } from "@/lib/sms-route-auth"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CATEGORY_MAP: Record<string, string> = {
  subscription: "Abonelik",
  sms_package: "SMS Paketi",
  whatsapp_package: "WhatsApp Paketi",
  user_package: "Kullanıcı Paketi",
}

type LegacyBody = {
  type: "subscription" | "sms_package" | "whatsapp_package" | "user_package"
  planId?: string
  packageId?: string
  billing?: "monthly" | "yearly"
  userId: string
  companyId: string
}

type CartBody = {
  items: CartItem[]
  userId: string
  companyId: string
}

async function resolveLinePrice(item: CartItem): Promise<{ price: number; name: string } | null> {
  if (item.type === "subscription") {
    const billing = item.billing || "monthly"
    const price = await findPlanPrice(item.productKey, billing)
    if (price == null) return null
    const { plans } = await fetchCatalog(false)
    const plan = plans.find((p) => p.id === item.productKey)
    return { price: price * item.quantity, name: plan?.name_tr || item.title }
  }
  const product = await findProductPrice(item.productKey)
  if (!product) return null
  return { price: product.price * item.quantity, name: product.title }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyUserBearer(req)
    if (!auth.ok) {
      return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 })
    }

    const body = await req.json()
    const userId = auth.userId
    const companyId = body.companyId as string

    if (!companyId) {
      return NextResponse.json({ error: "Eksik parametre" }, { status: 400 })
    }

    const { data: profileRow } = await supabaseAdmin
      .from("profiles")
      .select("company_id, full_name, phone")
      .eq("id", userId)
      .single()

    if (!profileRow?.company_id || profileRow.company_id !== companyId) {
      return NextResponse.json({ error: "Yetkisiz işlem" }, { status: 403 })
    }

    let cartItems: CartItem[] = []

    if (Array.isArray(body.items) && body.items.length > 0) {
      cartItems = (body as CartBody).items
    } else {
      const legacy = body as LegacyBody
      if (!legacy.type) {
        return NextResponse.json({ error: "Sepet boş veya geçersiz istek" }, { status: 400 })
      }
      const key = legacy.planId || legacy.packageId
      if (!key) {
        return NextResponse.json({ error: "Ürün seçilmedi" }, { status: 400 })
      }
      cartItems = [
        {
          lineId: key,
          type: legacy.type,
          productKey: key,
          title: key,
          unitPrice: 0,
          billing: legacy.billing,
          quantity: 1,
        },
      ]
    }

    const buyerName = profileRow?.full_name?.split(" ")[0] || "Müşteri"
    const buyerSurname = profileRow?.full_name?.split(" ").slice(1).join(" ") || "."
    const buyerPhone = profileRow?.phone || "+905000000000"

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId)
    const buyerEmail = authUser?.user?.email || "customer@example.com"

    const checkoutItems: CheckoutItem[] = []
    let total = 0
    const metaItems: Array<{
      type: string
      productKey: string
      billing?: string
      quantity: number
    }> = []

    for (const item of cartItems) {
      const resolved = await resolveLinePrice(item)
      if (!resolved || resolved.price <= 0) {
        return NextResponse.json({ error: `Geçersiz ürün: ${item.productKey}` }, { status: 400 })
      }
      total += resolved.price
      checkoutItems.push({
        id: `${item.type}-${item.productKey}`,
        name: item.title || resolved.name,
        category: CATEGORY_MAP[item.type] || "Ürün",
        price: resolved.price.toFixed(2),
        type: "VIRTUAL",
      })
      metaItems.push({
        type: item.type,
        productKey: item.productKey,
        billing: item.billing,
        quantity: item.quantity,
      })
    }

    const priceStr = total.toFixed(2)
    const conversationId = `${companyId.slice(0, 8)}-${Date.now()}`
    const basketId = `cart-${Date.now()}`
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1"

    const primaryType = cartItems.length === 1 ? cartItems[0].type : "cart"

    const result = await createCheckoutForm({
      conversationId,
      price: priceStr,
      paidPrice: priceStr,
      basketId,
      buyerEmail,
      buyerName,
      buyerSurname,
      buyerPhone,
      buyerIp: ip,
      buyerId: userId,
      items: checkoutItems,
      callbackUrl: `${baseUrl}/api/payment/callback`,
    })

    if (result.status === "success" && result.checkoutFormContent) {
      await supabaseAdmin.from("payment_transactions").insert({
        company_id: companyId,
        user_id: userId,
        type: primaryType,
        amount: total,
        currency: "TRY",
        status: "pending",
        iyzico_token: result.token,
        metadata: {
          items: metaItems,
          conversationId,
          basketId,
        },
      })

      return NextResponse.json({
        checkoutFormContent: result.checkoutFormContent,
        token: result.token,
      })
    }

    return NextResponse.json(
      { error: result.errorMessage || "Ödeme formu oluşturulamadı" },
      { status: 500 }
    )
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 })
  }
}
