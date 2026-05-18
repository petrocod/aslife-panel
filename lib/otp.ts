import { createClient } from "@supabase/supabase-js"
import { sendVerimorSms } from "./verimor-sms"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const OTP_LENGTH = 6
const OTP_TTL_MINUTES = 5
const OTP_RATE_LIMIT_SECONDS = 60
const OTP_IP_RATE_LIMIT_SECONDS = 120
const OTP_IP_MAX_PER_WINDOW = 5

const ipOtpAttempts = new Map<string, { count: number; windowStart: number }>()

function checkIpRateLimit(ip: string): string | null {
  const now = Date.now()
  const entry = ipOtpAttempts.get(ip)
  if (!entry || now - entry.windowStart > OTP_IP_RATE_LIMIT_SECONDS * 1000) {
    ipOtpAttempts.set(ip, { count: 1, windowStart: now })
    return null
  }
  entry.count += 1
  if (entry.count > OTP_IP_MAX_PER_WINDOW) {
    return "Çok fazla istek. Lütfen birkaç dakika sonra tekrar deneyin."
  }
  return null
}

function generateCode(): string {
  const digits = "0123456789"
  let code = ""
  for (let i = 0; i < OTP_LENGTH; i++) {
    code += digits[Math.floor(Math.random() * digits.length)]
  }
  return code
}

export async function sendOtp(
  phone: string,
  clientIp?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (clientIp) {
    const ipErr = checkIpRateLimit(clientIp)
    if (ipErr) return { ok: false, error: ipErr }
  }
  let cleaned = phone.replace(/\D/g, "")
  if (cleaned.length < 10) {
    return { ok: false, error: "Geçersiz telefon numarası." }
  }
  // Ensure 90 country prefix for Turkey
  if (cleaned.length === 10) cleaned = "90" + cleaned
  if (cleaned.length === 11 && cleaned.startsWith("0")) cleaned = "90" + cleaned.slice(1)

  const { data: rateData } = await supabaseAdmin
    .from("verification_codes")
    .select("created_at")
    .eq("phone", cleaned)
    .eq("verified", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (rateData) {
    const lastSent = new Date(rateData.created_at).getTime()
    if (Date.now() - lastSent < OTP_RATE_LIMIT_SECONDS * 1000) {
      return { ok: false, error: "Lütfen 60 saniye bekleyiniz." }
    }
  }

  const code = generateCode()
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString()

  const { error: dbErr } = await supabaseAdmin.from("verification_codes").insert({
    phone: cleaned,
    code,
    expires_at: expiresAt,
    verified: false,
  })

  if (dbErr) {
    console.error("[otp] insert error:", dbErr.message)
    return { ok: false, error: "Doğrulama sistemi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin." }
  }

  const smsResult = await sendVerimorSms({
    dest: cleaned,
    msg: `aSistan dogrulama kodunuz: ${code} (5 dakika gecerli)`,
  })

  if (!smsResult.ok) {
    return { ok: false, error: "SMS gönderilemedi. Lütfen numaranızı kontrol edin." }
  }

  return { ok: true }
}

export async function verifyOtp(
  phone: string,
  code: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  let cleaned = phone.replace(/\D/g, "")
  if (cleaned.length === 10) cleaned = "90" + cleaned
  if (cleaned.length === 11 && cleaned.startsWith("0")) cleaned = "90" + cleaned.slice(1)

  const { data } = await supabaseAdmin
    .from("verification_codes")
    .select("*")
    .eq("phone", cleaned)
    .eq("code", code)
    .eq("verified", false)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (!data) {
    return { ok: false, error: "Geçersiz veya süresi dolmuş kod." }
  }

  await supabaseAdmin
    .from("verification_codes")
    .update({ verified: true })
    .eq("id", data.id)

  return { ok: true }
}
