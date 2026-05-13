import { NextRequest, NextResponse } from "next/server"
import { verifyCron, verifyUserBearer } from "@/lib/sms-route-auth"
import { fetchVerimorBalance, getVerimorEnvStatus } from "@/lib/verimor-sms"

export const runtime = "nodejs"

/**
 * Verimor bağlantı testi: kalan kredi sorgusu (SMS gönderilmez).
 * — Authorization: Bearer <Supabase JWT> veya x-cron-secret
 */
export async function GET(req: NextRequest) {
  const cronOk = verifyCron(req)
  const userOk = cronOk ? { ok: false as const } : await verifyUserBearer(req)
  if (!cronOk && !userOk.ok) {
    return NextResponse.json(
      { error: "Yetkisiz: Bearer oturumu veya geçerli x-cron-secret gerekli." },
      { status: 401 },
    )
  }

  const env = getVerimorEnvStatus()
  if (!env.verimorUsernameSet || !env.verimorPasswordSet) {
    return NextResponse.json(
      {
        ok: false,
        step: "env",
        env,
        message: "VERIMOR_USERNAME ve VERIMOR_PASSWORD .env.local içine ekleyin, sunucuyu yeniden başlatın.",
      },
      { status: 503 },
    )
  }

  try {
    const result = await fetchVerimorBalance()
    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          step: "verimor_api",
          env,
          verimor: {
            httpStatus: result.httpStatus,
            error: result.error,
            hint:
              result.httpStatus === 401
                ? "Kullanıcı/şifre hatalı veya IP OİM’de izinli değil (BTK: sunucu IP’si SMS ayarlarına kayıtlı olmalı)."
                : undefined,
          },
        },
        { status: 502 },
      )
    }
    return NextResponse.json({
      ok: true,
      step: "verimor_balance",
      env,
      balance: result.balance,
      checkedBy: cronOk ? "cron" : "user",
      userId: userOk.ok ? userOk.userId : undefined,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Bilinmeyen hata"
    return NextResponse.json({ ok: false, step: "exception", env, error: message }, { status: 500 })
  }
}
