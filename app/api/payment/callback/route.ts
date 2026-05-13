import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { retrieveCheckoutForm } from "@/lib/iyzico"
import { recordExpenseFromPlatformPurchase } from "@/lib/finance/integration"

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

      const meta = txn.metadata as { planId?: string; packageId?: string } | null

      if (txn.type === "subscription" && meta?.planId) {
        await supabaseAdmin
          .from("company_subscriptions")
          .update({
            plan_id: meta.planId,
            status: "active",
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("company_id", txn.company_id)
      } else if (txn.type === "sms_package" && meta?.packageId) {
        const creditMap: Record<string, number> = {
          sms_500: 500,
          sms_1000: 1000,
          sms_3000: 3000,
        }
        const credits = creditMap[meta.packageId] || 500
        await supabaseAdmin.from("sms_packages").insert({
          company_id: txn.company_id,
          credits_total: credits,
          credits_used: 0,
          purchased_at: new Date().toISOString(),
        })
      } else if (txn.type === "whatsapp_package" && meta?.packageId) {
        const creditMap: Record<string, number> = {
          wp_500: 500,
          wp_1000: 1000,
          wp_3000: 3000,
        }
        const credits = creditMap[meta.packageId] || 500
        await supabaseAdmin.from("whatsapp_packages").insert({
          company_id: txn.company_id,
          credits_total: credits,
          credits_used: 0,
          purchased_at: new Date().toISOString(),
        })
      }

      // Record as expense in financial reports
      const descMap: Record<string, string> = {
        subscription: `Abonelik ödemesi: ${meta?.planId || ""}`,
        sms_package: `SMS paketi: ${meta?.packageId || ""}`,
        whatsapp_package: `WhatsApp paketi: ${meta?.packageId || ""}`,
        user_package: `Kullanıcı paketi: ${meta?.packageId || ""}`,
      }
      try {
        await recordExpenseFromPlatformPurchase(supabaseAdmin, {
          companyId: txn.company_id,
          transactionId: txn.id,
          amount: parseFloat(txn.amount),
          type: txn.type,
          description: descMap[txn.type] || "Platform ödemesi",
        })
      } catch { /* non-critical */ }

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
      return NextResponse.redirect(`${baseUrl}/hesabim?payment=success`)
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
