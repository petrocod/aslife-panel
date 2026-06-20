import { NextRequest, NextResponse } from "next/server"
import { verifyUserBearer } from "@/lib/sms-route-auth"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { computeSlaDueAt } from "@/lib/support-sla"
import { notifyAdminsNewTicket } from "@/lib/support-notifications"

const VALID_PRIORITIES = new Set(["low", "normal", "high", "urgent"])

export async function POST(req: NextRequest) {
  const auth = await verifyUserBearer(req)
  if (!auth.ok) {
    return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 })
  }

  let body: { subject?: string; priority?: string; message?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 })
  }

  const subject = body.subject?.trim()
  const message = body.message?.trim()
  const priority = body.priority && VALID_PRIORITIES.has(body.priority) ? body.priority : "normal"

  if (!subject || !message) {
    return NextResponse.json({ error: "Konu ve mesaj zorunludur" }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id, full_name, email")
    .eq("id", auth.userId)
    .maybeSingle()

  if (profileError || !profile?.company_id) {
    return NextResponse.json({ error: "Şirket bilgisi bulunamadı" }, { status: 403 })
  }

  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", profile.company_id)
    .maybeSingle()

  const now = new Date().toISOString()
  const { data: ticket, error: ticketError } = await supabase
    .from("support_tickets")
    .insert({
      company_id: profile.company_id,
      user_id: auth.userId,
      subject,
      priority,
      sla_due_at: computeSlaDueAt(now),
    })
    .select("id, subject, status, priority, created_at, updated_at")
    .single()

  if (ticketError || !ticket) {
    return NextResponse.json(
      { error: ticketError?.message || "Talep oluşturulamadı" },
      { status: 500 }
    )
  }

  const { error: messageError } = await supabase.from("ticket_messages").insert({
    ticket_id: ticket.id,
    sender_type: "user",
    sender_id: auth.userId,
    message,
  })

  if (messageError) {
    await supabase.from("support_tickets").delete().eq("id", ticket.id)
    return NextResponse.json({ error: "Mesaj kaydedilemedi" }, { status: 500 })
  }

  void notifyAdminsNewTicket({
    ticketId: ticket.id,
    subject: ticket.subject,
    priority: ticket.priority,
    companyName: company?.name || "—",
    userName: profile.full_name || profile.email || "—",
    userEmail: profile.email || "",
    firstMessage: message,
  })

  return NextResponse.json({ ticket }, { status: 201 })
}
