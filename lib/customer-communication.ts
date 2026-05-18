import { getSupabaseAdmin } from "@/lib/supabase-admin"

export type CommChannel = "sms" | "email" | "whatsapp"

export async function logCustomerCommunication(opts: {
  companyId: string
  customerId: string
  channel: CommChannel
  messageBody: string
  templateKey?: string
  status?: "sent" | "failed" | "skipped"
  errorMessage?: string | null
}) {
  try {
    const supabase = getSupabaseAdmin()
    await supabase.from("customer_communication_log").insert({
      company_id: opts.companyId,
      customer_id: opts.customerId,
      channel: opts.channel,
      message_body: opts.messageBody,
      template_key: opts.templateKey ?? null,
      status: opts.status ?? "sent",
      error_message: opts.errorMessage ?? null,
    })
  } catch {
    // non-blocking
  }
}

export function generatePortalToken(): string {
  const bytes = new Uint8Array(16)
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}
