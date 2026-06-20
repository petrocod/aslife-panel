import { NextRequest, NextResponse } from "next/server"
import { notifyAdminsNewTicket } from "@/lib/support-notifications"

/** @deprecated Prefer POST /api/support/tickets which creates ticket + sends email */
export async function POST(req: NextRequest) {
  try {
    const { ticketId, subject, priority, companyName, userName, userEmail, firstMessage } =
      await req.json()

    if (!ticketId || !subject) {
      return NextResponse.json({ ok: false, error: "ticketId and subject required" }, { status: 400 })
    }

    await notifyAdminsNewTicket({
      ticketId,
      subject,
      priority: priority || "normal",
      companyName: companyName || "—",
      userName: userName || "—",
      userEmail: userEmail || "",
      firstMessage: firstMessage || "",
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
