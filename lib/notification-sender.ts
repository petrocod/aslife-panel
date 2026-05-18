/**
 * Unified notification dispatcher: SMS + Email + WhatsApp.
 *
 * Each outbound notification:
 *  1. Checks per-company template enablement  (notification_templates table)
 *  2. Checks per-customer channel preferences (notification_preferences table)
 *  3. Resolves template text with placeholder values
 *  4. Dispatches to all enabled channels in parallel
 *  5. Logs results to notification_log table
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { sendVerimorSms } from "@/lib/verimor-sms"
import { sendWhatsappText } from "@/lib/whatsapp"
import { sendEmail } from "@/lib/email"
import { canSendNotification } from "@/lib/notification-preferences"
import { logCustomerCommunication } from "@/lib/customer-communication"
import {
  NOTIFICATION_TEMPLATES,
  applyTemplatePreview,
  buildCompanyPlaceholderOverrides,
  type CustomerNotificationTemplate,
} from "@/lib/musteri-bildirimleri"

export type NotificationTemplateKey =
  | "yeni-musteri"
  | "randevu-onayi"
  | "randevu-iptali"
  | "randevu-hatiratici"
  | "randevu-guncelleme"
  | "randevu-katilim"
  | "kredi-bitis"
  | "kredi-kullanimi"
  | "paket-bitis-hatiratici"
  | "paket-kullanimi"
  | "musteri-odeme-hatiratici"

const TEMPLATE_KEY_TO_OLD: Record<string, string> = {
  "yeni-musteri": "new_customer",
  "randevu-onayi": "appointment_created",
  "randevu-iptali": "appointment_cancelled",
  "randevu-hatiratici": "appointment_reminder",
  "randevu-guncelleme": "appointment_updated",
  "randevu-katilim": "appointment_attendance",
  "kredi-bitis": "credit_expiry",
  "kredi-kullanimi": "credit_used",
  "paket-bitis-hatiratici": "package_expiry",
  "paket-kullanimi": "package_used",
  "musteri-odeme-hatiratici": "payment_reminder",
}

type ChannelResult = { ok: boolean; error?: string }
export type NotificationResult = {
  sms: ChannelResult
  email: ChannelResult
  whatsapp: ChannelResult
}

export type SendNotificationParams = {
  companyId: string
  templateKey: NotificationTemplateKey
  customerId?: string
  customerName: string
  customerPhone?: string | null
  customerEmail?: string | null
  /** Extra placeholder values: service_title, appointment_starting_at_date, etc. */
  params?: Record<string, string>
}

async function getCompanyRow(companyId: string) {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .single()
  return data
}

async function isTemplateEnabled(
  companyId: string,
  templateKey: string,
  channel: "sms" | "email" | "whatsapp"
): Promise<boolean> {
  const supabase = getSupabaseAdmin()
  const oldKey = TEMPLATE_KEY_TO_OLD[templateKey] || templateKey
  const { data } = await supabase
    .from("notification_templates")
    .select("is_active, sms_enabled, email_enabled, whatsapp_enabled")
    .eq("company_id", companyId)
    .or(`template_key.eq.${templateKey},template_key.eq.${oldKey}`)
    .maybeSingle()

  if (!data) return true

  if (data.is_active === false) return false
  switch (channel) {
    case "sms": return data.sms_enabled !== false
    case "email": return data.email_enabled !== false
    case "whatsapp": return data.whatsapp_enabled !== false
  }
}

function getTemplate(key: string): CustomerNotificationTemplate | undefined {
  return NOTIFICATION_TEMPLATES.find((t) => t.id === key)
}

function resolveText(
  rawTemplate: string,
  placeholders: Record<string, string>
): string {
  return applyTemplatePreview(rawTemplate, placeholders)
}

function buildEmailHtml(
  subject: string,
  bodyText: string,
  companyName: string,
  companyPhone: string,
  companyWebsite: string
): string {
  const lines = bodyText.split("\n").filter((l) => l.trim())
  const bodyHtml = lines
    .map((line) => `<p style="margin:0 0 8px;color:#334155;font-size:14px;line-height:1.6">${escapeHtml(line)}</p>`)
    .join("\n")

  const websiteShort = companyWebsite.replace(/^https?:\/\//i, "").replace(/\/$/, "")

  return `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:560px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
  <div style="padding:24px 32px;border-bottom:1px solid #e2e8f0">
    <h2 style="margin:0;font-size:18px;font-weight:700;color:#0f172a">${escapeHtml(companyName)}</h2>
    <p style="margin:4px 0 0;font-size:12px;color:#94a3b8">Resmi bildirim</p>
  </div>
  <div style="padding:32px">
    <h3 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0f172a">${escapeHtml(subject)}</h3>
    ${bodyHtml}
  </div>
  <div style="padding:20px 32px;border-top:1px solid #e2e8f0;background:#f8fafc;text-align:center">
    <p style="margin:0;font-size:11px;color:#94a3b8">
      Bu e-posta <strong style="color:#475569">${escapeHtml(companyName)}</strong> tarafından gönderilmiştir.
    </p>
    <p style="margin:6px 0 0;font-size:11px;color:#94a3b8">
      ${escapeHtml(companyPhone)}${websiteShort ? ` · ${escapeHtml(websiteShort)}` : ""}
    </p>
  </div>
</div>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

async function logNotification(
  companyId: string,
  customerId: string | undefined,
  templateKey: string,
  results: NotificationResult
) {
  try {
    const supabase = getSupabaseAdmin()
    await supabase.from("notification_log").insert({
      company_id: companyId,
      customer_id: customerId || null,
      template_key: templateKey,
      sms_sent: results.sms.ok,
      email_sent: results.email.ok,
      whatsapp_sent: results.whatsapp.ok,
      sms_error: results.sms.error || null,
      email_error: results.email.error || null,
      whatsapp_error: results.whatsapp.error || null,
    })
  } catch {
    // logging failures should not break the flow
  }
}

export async function sendNotification(
  opts: SendNotificationParams
): Promise<NotificationResult> {
  const {
    companyId,
    templateKey,
    customerId,
    customerName,
    customerPhone,
    customerEmail,
    params = {},
  } = opts

  const result: NotificationResult = {
    sms: { ok: false, error: "skipped" },
    email: { ok: false, error: "skipped" },
    whatsapp: { ok: false, error: "skipped" },
  }

  const template = getTemplate(templateKey)
  if (!template) {
    const err = `Template not found: ${templateKey}`
    result.sms.error = err
    result.email.error = err
    result.whatsapp.error = err
    return result
  }

  const companyRow = await getCompanyRow(companyId)
  const companyOverrides = buildCompanyPlaceholderOverrides(companyRow)
  const placeholders: Record<string, string> = {
    ...companyOverrides,
    customer_name: customerName,
    ...params,
  }

  const supabase = getSupabaseAdmin()
  const promises: Promise<void>[] = []
  const smsText = resolveText(template.defaultSms, placeholders)
  const emailText = resolveText(template.defaultEmail, placeholders)
  const waText = resolveText(template.defaultWhatsapp, placeholders)

  async function logChannel(
    channel: "sms" | "email" | "whatsapp",
    body: string,
    ok: boolean,
    err?: string
  ) {
    if (!customerId || !body.trim()) return
    await logCustomerCommunication({
      companyId,
      customerId,
      channel,
      messageBody: body,
      templateKey,
      status: ok ? "sent" : "failed",
      errorMessage: err ?? null,
    })
  }

  // ── SMS ──
  if (customerPhone && customerPhone.length >= 10) {
    promises.push(
      (async () => {
        try {
          const tplEnabled = await isTemplateEnabled(companyId, templateKey, "sms")
          if (!tplEnabled) {
            result.sms = { ok: false, error: "template_disabled" }
            await logChannel("sms", smsText, false, "template_disabled")
            return
          }

          if (customerId) {
            const allowed = await canSendNotification(supabase, customerId, companyId, "sms")
            if (!allowed) {
              result.sms = { ok: false, error: "customer_opted_out" }
              await logChannel("sms", smsText, false, "customer_opted_out")
              return
            }
          }

          const phone = customerPhone.replace(/\+/g, "")
          const smsResult = await sendVerimorSms({ dest: phone, msg: smsText })
          result.sms = smsResult.ok
            ? { ok: true }
            : { ok: false, error: smsResult.ok ? undefined : smsResult.errorCode }
          await logChannel("sms", smsText, result.sms.ok, result.sms.error)
        } catch (err) {
          result.sms = { ok: false, error: err instanceof Error ? err.message : "sms_error" }
          await logChannel("sms", smsText, false, result.sms.error)
        }
      })()
    )
  }

  // ── Email ──
  if (customerEmail) {
    promises.push(
      (async () => {
        try {
          const tplEnabled = await isTemplateEnabled(companyId, templateKey, "email")
          if (!tplEnabled) { result.email = { ok: false, error: "template_disabled" }; return }

          if (customerId) {
            const allowed = await canSendNotification(supabase, customerId, companyId, "email")
            if (!allowed) { result.email = { ok: false, error: "customer_opted_out" }; return }
          }

          const bodyText = emailText
          const companyName = placeholders.company_company_name || companyRow?.name || "aSistan"
          const companyPhone = placeholders.company_fullphone || companyRow?.phone || ""
          const companyWebsite = placeholders.company_website || companyRow?.website || ""
          const subject = `${companyName} - ${template.title}`
          const html = buildEmailHtml(subject, bodyText, companyName, companyPhone, companyWebsite)

          const emailResult = await sendEmail({
            to: customerEmail,
            subject,
            html,
            text: bodyText,
          })
          result.email = emailResult.ok
            ? { ok: true }
            : { ok: false, error: emailResult.error }
          await logChannel("email", bodyText, result.email.ok, result.email.error)
        } catch (err) {
          result.email = { ok: false, error: err instanceof Error ? err.message : "email_error" }
          await logChannel("email", emailText, false, result.email.error)
        }
      })()
    )
  }

  // ── WhatsApp ──
  if (customerPhone && customerPhone.length >= 10) {
    promises.push(
      (async () => {
        try {
          const tplEnabled = await isTemplateEnabled(companyId, templateKey, "whatsapp")
          if (!tplEnabled) { result.whatsapp = { ok: false, error: "template_disabled" }; return }

          if (customerId) {
            const allowed = await canSendNotification(supabase, customerId, companyId, "whatsapp")
            if (!allowed) { result.whatsapp = { ok: false, error: "customer_opted_out" }; return }
          }

          const waResult = await sendWhatsappText(customerPhone, waText)
          result.whatsapp = waResult.ok
            ? { ok: true }
            : { ok: false, error: waResult.ok ? undefined : waResult.error }
          await logChannel("whatsapp", waText, result.whatsapp.ok, result.whatsapp.error)
        } catch (err) {
          result.whatsapp = { ok: false, error: err instanceof Error ? err.message : "whatsapp_error" }
          await logChannel("whatsapp", waText, false, result.whatsapp.error)
        }
      })()
    )
  }

  await Promise.allSettled(promises)
  await logNotification(companyId, customerId, templateKey, result)

  return result
}
