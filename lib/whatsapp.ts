/**
 * WhatsApp Business API integration.
 * Uses the Meta/WhatsApp Cloud API for sending template & text messages.
 *
 * Required env vars:
 *   WHATSAPP_TOKEN          – Bearer token (permanent or system-user token)
 *   WHATSAPP_PHONE_NUMBER_ID – Phone number ID from Meta Business dashboard
 *
 * If not configured, messages are logged to console (no-op in dev).
 */

const WA_API_VERSION = "v21.0"

function getConfig() {
  const token = (process.env.WHATSAPP_TOKEN || "").trim()
  const phoneNumberId = (process.env.WHATSAPP_PHONE_NUMBER_ID || "").trim()
  return { token, phoneNumberId, configured: !!(token && phoneNumberId) }
}

export function getWhatsappEnvStatus() {
  const { token, phoneNumberId } = getConfig()
  return {
    whatsappTokenSet: token.length > 0,
    whatsappPhoneNumberIdSet: phoneNumberId.length > 0,
  }
}

export function normalizePhoneForWhatsapp(input: string): string | null {
  const s = input.trim().replace(/\s+/g, "")
  if (!s) return null
  let digits = s.replace(/^\+/, "").replace(/\D/g, "")
  if (digits.startsWith("00")) digits = digits.slice(2)
  if (digits.startsWith("0") && digits.length === 11) {
    digits = `90${digits.slice(1)}`
  }
  if (digits.length === 10 && digits.startsWith("5")) {
    digits = `90${digits}`
  }
  if (digits.length < 10) return null
  return digits
}

export type WhatsappSendResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string }

export async function sendWhatsappText(
  to: string,
  text: string
): Promise<WhatsappSendResult> {
  const { token, phoneNumberId, configured } = getConfig()

  const phone = normalizePhoneForWhatsapp(to)
  if (!phone) return { ok: false, error: "Geçersiz telefon numarası" }

  if (!configured) {
    console.warn("[whatsapp] Not configured, logging message:", phone, text.slice(0, 80))
    return { ok: true, messageId: "dev-noop" }
  }

  try {
    const url = `https://graph.facebook.com/${WA_API_VERSION}/${phoneNumberId}/messages`
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phone,
        type: "text",
        text: { preview_url: false, body: text },
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      const errMsg = data?.error?.message || `HTTP ${res.status}`
      return { ok: false, error: errMsg }
    }

    const msgId = data?.messages?.[0]?.id || "unknown"
    return { ok: true, messageId: msgId }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "WhatsApp gönderim hatası"
    return { ok: false, error: msg }
  }
}
