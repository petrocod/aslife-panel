/**
 * Verimor Toplu SMS API (HTTPS POST JSON)
 * @see https://github.com/verimor/SMS-API/blob/master/user_guide.md
 */

const VERIMOR_BASE = "https://sms.verimor.com.tr/v2"
const VERIMOR_SEND_JSON = `${VERIMOR_BASE}/send.json`

export type IysRecipientType = "BIREYSEL" | "TACIR"

export type VerimorSendOptions = {
  /** Tek veya birden fazla numara; normalize edilir (905XXXXXXXXX) */
  dest: string | string[]
  msg: string
  /** Başlık (kayıtlı source_addr). Boşsa env VERIMOR_SOURCE_ADDR veya hesaptaki ilk başlık */
  source_addr?: string
  valid_for?: string
  /** ISO veya '2015-02-20 16:06:00' */
  send_at?: string
  custom_id?: string
  datacoding?: "0" | "1" | "2"
  is_commercial?: boolean
  iys_recipient_type?: IysRecipientType
}

export type VerimorSendResult =
  | { ok: true; campaignId: string; rawBody: string }
  | { ok: false; httpStatus: number; errorCode: string; rawBody: string }

/** Rakamları Verimor dest formatına (905XXXXXXXXX) çevirir */
export function normalizeTurkiyeGsmForVerimor(input: string): string | null {
  const s = input.trim().replace(/\s+/g, "")
  if (!s) return null
  let digits = s.replace(/^\+/, "").replace(/\D/g, "")
  if (digits.startsWith("00")) digits = digits.slice(2)
  if (digits.startsWith("90") && digits.length >= 12) {
    return digits.slice(0, 12)
  }
  if (digits.startsWith("0") && digits.length === 11) {
    return `90${digits.slice(1)}`
  }
  if (digits.length === 10 && digits.startsWith("5")) {
    return `90${digits}`
  }
  if (digits.length === 12 && digits.startsWith("90")) {
    return digits
  }
  return null
}

function destListToString(dest: string | string[]): string {
  const list = Array.isArray(dest) ? dest : [dest]
  const normalized: string[] = []
  for (const d of list) {
    const n = normalizeTurkiyeGsmForVerimor(d)
    if (n) normalized.push(n)
  }
  if (normalized.length === 0) {
    throw new Error("Geçerli GSM numarası yok (905XXXXXXXXX beklenir).")
  }
  return normalized.join(",")
}

function getCredentials(): { username: string; password: string } {
  const username = (process.env.VERIMOR_USERNAME || "").trim()
  const password = (process.env.VERIMOR_PASSWORD || "").trim()
  if (!username || !password) {
    throw new Error("VERIMOR_USERNAME ve VERIMOR_PASSWORD .env içinde tanımlı olmalıdır.")
  }
  return { username, password }
}

export function getVerimorEnvStatus() {
  const u = (process.env.VERIMOR_USERNAME || "").trim()
  const p = (process.env.VERIMOR_PASSWORD || "").trim()
  const s = (process.env.VERIMOR_SOURCE_ADDR || "").trim()
  return {
    verimorUsernameSet: u.length > 0,
    verimorPasswordSet: p.length > 0,
    verimorSourceSet: s.length > 0,
  }
}

/** Kalan kredi (GET /v2/balance) — SMS göndermeden kimlik / IP / ağ testi. */
export async function fetchVerimorBalance(): Promise<
  { ok: true; balance: number; rawBody: string } | { ok: false; httpStatus: number; error: string; rawBody: string }
> {
  const { username, password } = getCredentials()
  const url = new URL(`${VERIMOR_BASE}/balance`)
  url.searchParams.set("username", username)
  url.searchParams.set("password", password)
  const res = await fetch(url.toString(), { cache: "no-store" })
  const rawBody = (await res.text()).trim()
  if (!res.ok) {
    return { ok: false, httpStatus: res.status, error: rawBody || `HTTP_${res.status}`, rawBody }
  }
  const n = parseInt(rawBody, 10)
  if (Number.isNaN(n)) {
    return { ok: false, httpStatus: 200, error: "Beklenmeyen yanıt gövdesi", rawBody }
  }
  return { ok: true, balance: n, rawBody }
}

/**
 * Sunucu tarafından çağrılmalıdır. Başarılı yanıtta gövde genelde kampanya ID (sayısal string).
 */
export async function sendVerimorSms(options: VerimorSendOptions): Promise<VerimorSendResult> {
  const { username, password } = getCredentials()
  const defaultTitle = (process.env.VERIMOR_SOURCE_ADDR || "").trim()
  const dest = destListToString(options.dest)
  const msg = options.msg.trim()
  if (!msg) throw new Error("msg boş olamaz.")

  const body: Record<string, unknown> = {
    username,
    password,
    source_addr: (options.source_addr || defaultTitle || undefined) as string | undefined,
    valid_for: options.valid_for,
    send_at: options.send_at,
    custom_id: options.custom_id,
    datacoding: options.datacoding,
    messages: [
      {
        msg,
        dest,
      },
    ],
  }

  if (options.is_commercial !== undefined) {
    body.is_commercial = options.is_commercial
  }
  if (options.iys_recipient_type) {
    body.iys_recipient_type = options.iys_recipient_type
  }

  const res = await fetch(VERIMOR_SEND_JSON, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "*/*",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  })

  const rawBody = (await res.text()).trim()

  if (!res.ok) {
    return {
      ok: false,
      httpStatus: res.status,
      errorCode: rawBody || `HTTP_${res.status}`,
      rawBody,
    }
  }

  return { ok: true, campaignId: rawBody, rawBody }
}
