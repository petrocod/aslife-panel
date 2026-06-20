/**
 * Email infrastructure with provider abstraction.
 * Currently uses SMTP (nodemailer-compatible) as default.
 * Can be swapped to Resend/SendGrid by implementing EmailProvider interface.
 */

export interface EmailMessage {
  to: string
  subject: string
  html: string
  text?: string
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<{ ok: boolean; error?: string }>
  sendBulk(messages: EmailMessage[]): Promise<{ ok: boolean; sent: number; failed: number }>
}

// SMTP provider (uses fetch to Supabase Edge function or any SMTP relay)
class SmtpProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<{ ok: boolean; error?: string }> {
    try {
      // Use Supabase's built-in email via the auth.admin API for transactional emails
      // For production, replace with actual SMTP/Resend/SendGrid integration
      const smtpHost = process.env.SMTP_HOST
      const smtpPort = process.env.SMTP_PORT || "587"
      const smtpUser = process.env.SMTP_USER
      const smtpPass = process.env.SMTP_PASS
      const smtpFrom = process.env.SMTP_FROM || "noreply@asistan.com"

      if (!smtpHost || !smtpUser || !smtpPass) {
        console.warn("[email] SMTP not configured, logging email instead:", message.to, message.subject)
        return { ok: true }
      }

      // Dynamic import to avoid bundling nodemailer in client bundles
      const { default: nodemailer } = await import("nodemailer")
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: smtpPort === "465",
        auth: { user: smtpUser, pass: smtpPass },
      })

      await transporter.sendMail({
        from: smtpFrom,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      })

      return { ok: true }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "E-posta gönderilemedi"
      return { ok: false, error: errorMsg }
    }
  }

  async sendBulk(messages: EmailMessage[]): Promise<{ ok: boolean; sent: number; failed: number }> {
    let sent = 0
    let failed = 0
    for (const msg of messages) {
      const result = await this.send(msg)
      if (result.ok) sent++
      else failed++
    }
    return { ok: failed === 0, sent, failed }
  }
}

// Singleton instance
let _provider: EmailProvider | null = null

export function getEmailProvider(): EmailProvider {
  if (!_provider) {
    _provider = new SmtpProvider()
  }
  return _provider
}

export function setEmailProvider(provider: EmailProvider) {
  _provider = provider
}

// Convenience function
export async function sendEmail(message: EmailMessage) {
  return getEmailProvider().send(message)
}

// Email templates
export function buildOtpEmail(code: string): EmailMessage & { subject: string; html: string } {
  return {
    to: "",
    subject: "aSistan - Doğrulama Kodu",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#1e293b">Doğrulama Kodunuz</h2>
        <p style="color:#64748b">Aşağıdaki kodu kullanarak hesabınızı doğrulayabilirsiniz:</p>
        <div style="background:#f1f5f9;border-radius:8px;padding:24px;text-align:center;margin:24px 0">
          <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1e293b">${code}</span>
        </div>
        <p style="color:#94a3b8;font-size:12px">Bu kod 5 dakika geçerlidir.</p>
      </div>
    `,
  }
}

export function buildTicketNotificationEmail(ticketSubject: string, ticketId: string): EmailMessage & { subject: string; html: string } {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
  return {
    to: "",
    subject: `aSistan Destek - Yeni yanıt: ${ticketSubject}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#1e293b">Destek Talebinize Yanıt Geldi</h2>
        <p style="color:#64748b">"${ticketSubject}" konulu talebinize yeni bir yanıt verildi.</p>
        <a href="${baseUrl}/destek?ticket=${ticketId}"
           style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px">
          Yanıtı Görüntüle
        </a>
      </div>
    `,
  }
}

export function buildNewTicketAdminEmail(params: {
  ticketId: string
  subject: string
  priority: string
  companyName: string
  userName: string
  userEmail: string
  firstMessage: string
}): EmailMessage & { subject: string; html: string } {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
  const priorityLabel =
    params.priority === "urgent" ? "ACİL" : params.priority === "high" ? "YÜKSEK" : params.priority
  const adminUrl = `${baseUrl}/admin/tickets/${params.ticketId}`

  return {
    to: "",
    subject: `[Destek${priorityLabel === "ACİL" || priorityLabel === "YÜKSEK" ? ` - ${priorityLabel}` : ""}] ${params.subject}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px">
        <h2 style="color:#1e293b">Yeni Destek Talebi</h2>
        <p style="color:#64748b"><strong>Konu:</strong> ${params.subject}</p>
        <p style="color:#64748b"><strong>Öncelik:</strong> ${priorityLabel}</p>
        <p style="color:#64748b"><strong>Şirket:</strong> ${params.companyName}</p>
        <p style="color:#64748b"><strong>Kullanıcı:</strong> ${params.userName}${params.userEmail ? ` (${params.userEmail})` : ""}</p>
        <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0;color:#334155;white-space:pre-wrap">${params.firstMessage}</div>
        <a href="${adminUrl}"
           style="display:inline-block;background:#ea580c;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:8px">
          Admin Panelde Görüntüle
        </a>
      </div>
    `,
  }
}

export function buildReminderEmail(customerName: string, appointmentDate: string, companyName: string): EmailMessage & { subject: string; html: string } {
  return {
    to: "",
    subject: `${companyName} - Randevu Hatırlatması`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#1e293b">Randevu Hatırlatması</h2>
        <p style="color:#64748b">Sayın ${customerName},</p>
        <p style="color:#64748b">${appointmentDate} tarihindeki randevunuzu hatırlatmak isteriz.</p>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px">
          Bu bildirimi almak istemiyorsanız <a href="${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/unsubscribe" style="color:#2563eb">buraya tıklayın</a>.
        </p>
      </div>
    `,
  }
}
