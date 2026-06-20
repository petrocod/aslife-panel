import { getSupabaseAdmin } from "@/lib/supabase-admin"
import {
  buildNewTicketAdminEmail,
  buildTicketNotificationEmail,
  sendEmail,
} from "@/lib/email"

const FALLBACK_ADMIN_EMAIL = process.env.SUPPORT_ADMIN_EMAIL || "support@inasistan.com"

export async function getAdminNotificationEmails(): Promise<string[]> {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from("admin_users")
    .select("email")
    .eq("is_active", true)

  const fromDb = (data || [])
    .map((row) => row.email?.trim())
    .filter((email): email is string => Boolean(email))

  const emails = new Set<string>(fromDb)
  if (FALLBACK_ADMIN_EMAIL) {
    emails.add(FALLBACK_ADMIN_EMAIL)
  }

  return Array.from(emails)
}

export async function notifyAdminsNewTicket(params: {
  ticketId: string
  subject: string
  priority: string
  companyName: string
  userName: string
  userEmail: string
  firstMessage: string
}): Promise<void> {
  const recipients = await getAdminNotificationEmails()
  if (recipients.length === 0) return

  const template = buildNewTicketAdminEmail(params)
  await Promise.all(
    recipients.map((to) =>
      sendEmail({ ...template, to }).catch(() => ({ ok: false }))
    )
  )
}

export async function notifyUserTicketReply(params: {
  to: string
  ticketId: string
  ticketSubject: string
}): Promise<void> {
  if (!params.to.trim()) return

  const template = buildTicketNotificationEmail(params.ticketSubject, params.ticketId)
  await sendEmail({ ...template, to: params.to })
}
