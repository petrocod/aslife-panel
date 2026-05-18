import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { retrieveCheckoutForm } from "@/lib/iyzico"
import { recordExpenseFromPlatformPurchase } from "@/lib/finance/integration"
import { cartItemsFromMetadata, describeCartItems, fulfillCartItems } from "@/lib/payment/fulfill"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const token = formData.get("token") as string

    if (!token) {
      return NextResponse.redirect(new URL("/hesabim?payment=error", req.url))
    }

    const result = await retrieveCheckoutForm(token)

    const { data: txn } = await supabaseAdmin
      .from("payment_transactions")
      .select("*")
      .eq("iyzico_token", token)
      .single()

    if (!txn) {
      return NextResponse.redirect(new URL("/hesabim?payment=error", req.url))
    }

    if (result.status === "success" && result.paymentId) {
      await supabaseAdmin
        .from("payment_transactions")
        .update({
          status: "completed",
          iyzico_payment_id: result.paymentId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", txn.id)

      const meta = txn.metadata as Record<string, unknown> | null
      const cartItems = cartItemsFromMetadata(meta)
      if (cartItems.length > 0) {
        await fulfillCartItems(supabaseAdmin, txn.company_id, cartItems)
      }

      const descMap: Record<string, string> = {
        subscription: `Abonelik ödemesi`,
        sms_package: `SMS paketi`,
        whatsapp_package: `WhatsApp paketi`,
        user_package: `Kullanıcı paketi`,
        cart: `Sepet ödemesi`,
      }
      const paymentDesc =
        cartItems.length > 0
          ? `${descMap[txn.type] || "Platform ödemesi"}: ${describeCartItems(cartItems)}`
          : descMap[txn.type] || "Platform ödemesi"
      try {
        await recordExpenseFromPlatformPurchase(supabaseAdmin, {
          companyId: txn.company_id,
          transactionId: txn.id,
          amount: parseFloat(txn.amount),
          type: txn.type,
          description: paymentDesc,
        })
      } catch { /* non-critical */ }

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
      return NextResponse.redirect(`${baseUrl}/sepet?payment=success&cleared=1`)
    }

    await supabaseAdmin
      .from("payment_transactions")
      .update({
        status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", txn.id)

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    return NextResponse.redirect(`${baseUrl}/hesabim?payment=failed`)
  } catch {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    return NextResponse.redirect(`${baseUrl}/hesabim?payment=error`)
  }
}
