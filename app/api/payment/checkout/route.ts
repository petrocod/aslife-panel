import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createCheckoutForm, type CheckoutItem } from "@/lib/iyzico"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, planId, packageId, userId, companyId } = body as {
      type: "subscription" | "sms_package" | "whatsapp_package" | "user_package"
      planId?: string
      packageId?: string
      userId: string
      companyId: string
    }

    if (!userId || !companyId || !type) {
      return NextResponse.json({ error: "Eksik parametre" }, { status: 400 })
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, phone")
      .eq("id", userId)
      .single()

    const buyerName = profile?.full_name?.split(" ")[0] || "Müşteri"
    const buyerSurname = profile?.full_name?.split(" ").slice(1).join(" ") || "."
    const buyerPhone = profile?.phone || "+905000000000"

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId)
    const buyerEmail = authUser?.user?.email || "customer@example.com"

    let price = "0"
    let itemName = ""
    let itemCategory = ""

    if (type === "subscription" && planId) {
      const { data: plan } = await supabaseAdmin
        .from("subscription_plans")
        .select("name_tr, monthly_price_hint")
        .eq("id", planId)
        .single()

      const priceMap: Record<string, string> = {
        asistan: "750",
        asistan_plus: "1500",
        asistan_pro: "2100",
      }
      price = priceMap[planId] || "750"
      itemName = plan?.name_tr || "Abonelik"
      itemCategory = "Abonelik"
    } else if (type === "sms_package" && packageId) {
      const pkgMap: Record<string, { name: string; price: string }> = {
        sms_500: { name: "500 SMS Kredisi", price: "275" },
        sms_1000: { name: "1000 SMS Kredisi", price: "500" },
        sms_3000: { name: "3000 SMS Kredisi", price: "1350" },
      }
      const pkg = pkgMap[packageId] || { name: "SMS Paketi", price: "275" }
      price = pkg.price
      itemName = pkg.name
      itemCategory = "SMS Paketi"
    } else if (type === "whatsapp_package" && packageId) {
      const pkgMap: Record<string, { name: string; price: string }> = {
        wp_500: { name: "500 WhatsApp Kredisi", price: "275" },
        wp_1000: { name: "1000 WhatsApp Kredisi", price: "500" },
        wp_3000: { name: "3000 WhatsApp Kredisi", price: "1350" },
      }
      const pkg = pkgMap[packageId] || { name: "WhatsApp Paketi", price: "275" }
      price = pkg.price
      itemName = pkg.name
      itemCategory = "WhatsApp Paketi"
    } else if (type === "user_package" && packageId) {
      const pkgMap: Record<string, { name: string; price: string }> = {
        user_1: { name: "1 Ek Kullanıcı", price: "2592" },
        user_2: { name: "2 Ek Kullanıcı", price: "5184" },
      }
      const pkg = pkgMap[packageId] || { name: "Kullanıcı Paketi", price: "2592" }
      price = pkg.price
      itemName = pkg.name
      itemCategory = "Kullanıcı Paketi"
    }

    if (price === "0") {
      return NextResponse.json({ error: "Geçersiz paket" }, { status: 400 })
    }

    const conversationId = `${companyId.slice(0, 8)}-${Date.now()}`
    const basketId = `${type}-${planId || packageId}-${Date.now()}`
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

    const items: CheckoutItem[] = [
      {
        id: planId || packageId || type,
        name: itemName,
        category: itemCategory,
        price,
        type: "VIRTUAL",
      },
    ]

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1"

    const result = await createCheckoutForm({
      conversationId,
      price,
      paidPrice: price,
      basketId,
      buyerEmail,
      buyerName,
      buyerSurname,
      buyerPhone,
      buyerIp: ip,
      buyerId: userId,
      items,
      callbackUrl: `${baseUrl}/api/payment/callback`,
    })

    if (result.status === "success" && result.checkoutFormContent) {
      await supabaseAdmin.from("payment_transactions").insert({
        company_id: companyId,
        user_id: userId,
        type,
        amount: parseFloat(price),
        currency: "TRY",
        status: "pending",
        iyzico_token: result.token,
        metadata: { planId, packageId, conversationId, basketId },
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
