"use server"

import {
  fetchVerimorBalance,
  sendVerimorSms,
  getVerimorEnvStatus,
  type VerimorSendResult,
} from "./verimor-sms"

export type ConnectionTestResult =
  | { ok: true; balance: number }
  | { ok: false; error: string }

export type SendTestResult =
  | { ok: true; campaignId: string }
  | { ok: false; error: string }

export async function testVerimorConnectionAction(): Promise<ConnectionTestResult> {
  const env = getVerimorEnvStatus()

  if (!env.verimorUsernameSet || !env.verimorPasswordSet) {
    return { ok: false, error: "SMS servisi yapılandırılmamış. Lütfen yönetici ile iletişime geçin." }
  }

  try {
    const result = await fetchVerimorBalance()
    if (result.ok) {
      return { ok: true, balance: result.balance }
    }
    return { ok: false, error: "SMS servisine bağlanılamadı. Lütfen daha sonra tekrar deneyin." }
  } catch {
    return { ok: false, error: "SMS servisine bağlanılamadı." }
  }
}

export async function sendTestSmsAction(dest: string, msg: string): Promise<SendTestResult> {
  if (!dest.trim()) {
    return { ok: false, error: "Telefon numarası boş olamaz." }
  }
  if (!msg.trim()) {
    return { ok: false, error: "Mesaj metni boş olamaz." }
  }

  try {
    const result: VerimorSendResult = await sendVerimorSms({
      dest: dest.trim(),
      msg: msg.trim(),
    })

    if (result.ok) {
      return { ok: true, campaignId: result.campaignId }
    }

    const errorMap: Record<string, string> = {
      INSUFFICIENT_CREDITS: "Yetersiz kredi. SMS kredisi yok.",
      INVALID_DESTINATION_ADDRESS: "Geçersiz telefon numarası.",
      INVALID_SOURCE_ADDRESS: "Geçersiz gönderici başlığı.",
      MISSING_MESSAGE: "Mesaj metni boş.",
      MESSAGE_TOO_LONG: "Mesaj çok uzun.",
      FORBIDDEN_MESSAGE: "Mesaj yasak kelime içeriyor.",
      NUMERIC_SOURCE_ADDRESS_NOT_ALLOWED: "Alfanumerik başlık gerekli.",
    }

    return { ok: false, error: errorMap[result.errorCode] || "SMS gönderilemedi." }
  } catch {
    return { ok: false, error: "SMS gönderilemedi." }
  }
}
