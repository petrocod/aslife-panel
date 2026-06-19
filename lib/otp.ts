import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { sendVerimorSms } from "./verimor-sms"

const OTP_LENGTH = 6
const OTP_TTL_MINUTES = 5
const OTP_RATE_LIMIT_SECONDS = 60
const OTP_IP_RATE_LIMIT_SECONDS = 120
const OTP_IP_MAX_PER_WINDOW = 5

const ipOtpAttempts = new Map<string, { count: number; windowStart: number }>()

/** DB yokken veya geliştirmede yedek (OTP_DEV_FALLBACK=true) */
const devOtpStore = new Map<string, { code: string; expiresAt: number }>()

/** OTP_DEV_FALLBACK=true → SMS atlanır, kod ekranda gösterilir (geçici test). */
function devFallbackEnabled(): boolean {
  const flag = (process.env.OTP_DEV_FALLBACK || "").trim().toLowerCase()
  if (flag === "true") return true
  if (flag === "false") return false
  return process.env.NODE_ENV === "development"
}

function normalizePhone(phone: string): string | null {
  let cleaned = phone.replace(/\D/g, "")
  if (cleaned.length < 10) return null
  if (cleaned.length === 10) cleaned = "90" + cleaned
  if (cleaned.length === 11 && cleaned.startsWith("0")) cleaned = "90" + cleaned.slice(1)
  return cleaned
}

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

function storeDevOtp(phone: string, code: string): void {
  devOtpStore.set(phone, {
    code,
    expiresAt: Date.now() + OTP_TTL_MINUTES * 60 * 1000,
  })
  console.info(`[otp-dev] ${phone} → kod: ${code} (${OTP_TTL_MINUTES} dk geçerli, SMS atlanmış olabilir)`)
}

async function persistOtp(
  phone: string,
  code: string,
  expiresAt: string
): Promise<{ ok: true } | { ok: false; error: string; useDev: boolean }> {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { error: dbErr } = await supabaseAdmin.from("verification_codes").insert({
      phone,
      code,
      expires_at: expiresAt,
      verified: false,
    })

    if (!dbErr) return { ok: true }

    console.error("[otp] insert error:", dbErr.message, dbErr.code)

    if (devFallbackEnabled()) {
      storeDevOtp(phone, code)
      return { ok: true }
    }

    if (dbErr.code === "PGRST205" || dbErr.message.includes("verification_codes")) {
      return {
        ok: false,
        error:
          "Doğrulama tablosu kurulmamış. Supabase SQL Editor’da supabase/verification_codes.sql dosyasını çalıştırın.",
        useDev: false,
      }
    }

    return {
      ok: false,
      error: "Doğrulama sistemi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.",
      useDev: false,
    }
  } catch (e: unknown) {
    console.error("[otp] persist exception:", e)
    if (devFallbackEnabled()) {
      storeDevOtp(phone, code)
      return { ok: true }
    }
    return {
      ok: false,
      error: "Doğrulama sistemi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.",
      useDev: false,
    }
  }
}

export async function sendOtp(
  phone: string,
  clientIp?: string
): Promise<{ ok: true; devCode?: string } | { ok: false; error: string }> {
  const cleaned = normalizePhone(phone)
  if (!cleaned) {
    return { ok: false, error: "Geçersiz telefon numarası." }
  }

  if (devFallbackEnabled()) {
    const code = generateCode()
    storeDevOtp(cleaned, code)
    return { ok: true, devCode: code }
  }

  if (clientIp) {
    const ipErr = checkIpRateLimit(clientIp)
    if (ipErr) return { ok: false, error: ipErr }
  }

  try {
    const supabaseAdmin = getSupabaseAdmin()
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
  } catch {
    /* tablo yoksa dev fallback devam eder */
  }

  const code = generateCode()
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString()

  const persisted = await persistOtp(cleaned, code, expiresAt)
  if (!persisted.ok) {
    return { ok: false, error: persisted.error }
  }

  const smsResult = await sendVerimorSms({
    dest: cleaned,
    msg: `aSistan dogrulama kodunuz: ${code} (5 dakika gecerli)`,
  })
  if (!smsResult.ok) {
    console.error("[otp] SMS failed:", smsResult.errorCode, "→ dev fallback")
    storeDevOtp(cleaned, code)
    return { ok: true, devCode: code }
  }

  return { ok: true }
}

export async function verifyOtp(
  phone: string,
  code: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const cleaned = normalizePhone(phone)
  if (!cleaned) {
    return { ok: false, error: "Geçersiz telefon numarası." }
  }

  const devEntry = devOtpStore.get(cleaned)
  if (devEntry) {
    if (Date.now() > devEntry.expiresAt) {
      devOtpStore.delete(cleaned)
      return { ok: false, error: "Geçersiz veya süresi dolmuş kod." }
    }
    if (devEntry.code !== code) {
      return { ok: false, error: "Geçersiz veya süresi dolmuş kod." }
    }
    devOtpStore.delete(cleaned)
    return { ok: true }
  }

  try {
    const supabaseAdmin = getSupabaseAdmin()
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
  } catch {
    return { ok: false, error: "Geçersiz veya süresi dolmuş kod." }
  }
}
