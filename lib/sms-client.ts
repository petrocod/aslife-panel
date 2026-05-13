import { supabase } from "@/lib/supabase-client"

type SendSmsPayload = {
  dest: string | string[]
  msg: string
  source_addr?: string
  send_at?: string
  is_commercial?: boolean
  iys_recipient_type?: "BIREYSEL" | "TACIR"
}

type SmsResult =
  | { ok: true; campaignId: string; sentBy: string }
  | { ok: false; error: string; httpStatus?: number; code?: string }

type ConnectionResult =
  | { ok: true; balance: number }
  | { ok: false; error: string; hint?: string; step?: string }

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error("Oturum bulunamadı. Lütfen giriş yapın.")
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }
}

export async function sendSms(payload: SendSmsPayload): Promise<SmsResult> {
  const headers = await getAuthHeaders()
  const res = await fetch("/api/sms/send", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok || !data.ok) {
    return {
      ok: false,
      error: data.error || `HTTP ${res.status}`,
      httpStatus: data.httpStatus,
      code: data.code,
    }
  }
  return { ok: true, campaignId: data.campaignId, sentBy: data.sentBy }
}

export async function testConnection(): Promise<ConnectionResult> {
  const headers = await getAuthHeaders()
  const res = await fetch("/api/sms/connection", { headers })
  const data = await res.json()
  if (!res.ok || !data.ok) {
    return {
      ok: false,
      error: data.verimor?.error || data.message || data.error || `HTTP ${res.status}`,
      hint: data.verimor?.hint,
      step: data.step,
    }
  }
  return { ok: true, balance: data.balance }
}
