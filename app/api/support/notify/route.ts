import { NextRequest, NextResponse } from "next/server"

const ADMIN_EMAIL = process.env.SUPPORT_ADMIN_EMAIL || "support@inasistan.com"

export async function POST(req: NextRequest) {
  try {
    const { subject, priority, companyName, userName } = await req.json()

    const nodemailer = require("nodemailer") // eslint-disable-line @typescript-eslint/no-require-imports

    const smtpHost = process.env.SMTP_HOST
    const smtpPort = parseInt(process.env.SMTP_PORT || "587")
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS

    if (!smtpHost || !smtpUser || !smtpPass) {
      return NextResponse.json({ ok: false, error: "SMTP not configured" }, { status: 500 })
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    })

    const priorityLabel = priority === "urgent" ? "ACİL" : priority === "high" ? "YÜKSEK" : ""
    const subjectLine = `[Destek${priorityLabel ? ` - ${priorityLabel}` : ""}] ${subject}`

    await transporter.sendMail({
      from: `"aSistan Destek" <${smtpUser}>`,
      to: ADMIN_EMAIL,
      subject: subjectLine,
      html: `
        <h3>Yeni Destek Talebi</h3>
        <p><strong>Konu:</strong> ${subject}</p>
        <p><strong>Öncelik:</strong> ${priority}</p>
        <p><strong>Şirket:</strong> ${companyName || "—"}</p>
        <p><strong>Kullanıcı:</strong> ${userName || "—"}</p>
        <hr/>
        <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}">Panele Git</a></p>
      `,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
