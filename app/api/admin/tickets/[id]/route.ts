import { NextRequest, NextResponse } from "next/server"
import { verifyUserBearer } from "@/lib/sms-route-auth"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

async function verifyAdmin(req: NextRequest) {
  const userResult = await verifyUserBearer(req)
  if (!userResult.ok) return null
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from("admin_users")
    .select("id, role")
    .eq("user_id", userResult.userId)
    .eq("is_active", true)
    .single()
  if (!data) return null
  return { userId: userResult.userId, adminId: data.id, role: data.role }
}

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: RouteContext) {
  const admin = await verifyAdmin(req)
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await ctx.params
  const supabase = getSupabaseAdmin()

  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
  }

  const [companyRes, profileRes, messagesRes] = await Promise.all([
    supabase.from("companies").select("name").eq("id", ticket.company_id).maybeSingle(),
    supabase.from("profiles").select("full_name, email").eq("id", ticket.user_id).maybeSingle(),
    supabase.from("ticket_messages")
      .select("id, sender_type, sender_id, message, attachments, created_at")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true }),
  ])

  return NextResponse.json({
    id: ticket.id,
    subject: ticket.subject,
    status: ticket.status,
    priority: ticket.priority,
    company_id: ticket.company_id,
    user_id: ticket.user_id,
    created_at: ticket.created_at,
    updated_at: ticket.updated_at,
    sla_due_at: ticket.sla_due_at,
    first_response_at: ticket.first_response_at,
    company_name: companyRes.data?.name || "—",
    user_name: profileRes.data?.full_name || "—",
    user_email: profileRes.data?.email || "—",
    messages: messagesRes.data || [],
  })
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const admin = await verifyAdmin(req)
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await ctx.params
  const body = await req.json()
  const supabase = getSupabaseAdmin()

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.status) updates.status = body.status
  if (body.priority) updates.priority = body.priority
  if (body.assigned_to) updates.assigned_to = body.assigned_to

  const { data, error } = await supabase
    .from("support_tickets")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const admin = await verifyAdmin(req)
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await ctx.params
  const body = await req.json()

  if (!body.message || typeof body.message !== "string" || !body.message.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("id")
    .eq("id", id)
    .single()

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
  }

  const { data: msg, error } = await supabase
    .from("ticket_messages")
    .insert({
      ticket_id: id,
      sender_type: "support",
      sender_id: admin.userId,
      message: body.message.trim(),
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: existing } = await supabase
    .from("support_tickets")
    .select("first_response_at, status")
    .eq("id", id)
    .single()

  const ticketUpdates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    status: existing?.status === "open" ? "in_progress" : existing?.status,
  }
  if (!existing?.first_response_at) {
    ticketUpdates.first_response_at = new Date().toISOString()
  }

  await supabase.from("support_tickets").update(ticketUpdates).eq("id", id)

  return NextResponse.json(msg, { status: 201 })
}
