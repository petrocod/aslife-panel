/** Plan kodları — DB subscription_plans.id ile aynı */
export const PLAN_IDS = {
  solo: "asistan",
  plus: "asistan_plus",
  pro: "asistan_pro",
} as const

/** Tablo yok / satır yok: tek kullanıcı varsayılanı */
export const FALLBACK_SOLO = {
  planId: PLAN_IDS.solo,
  nameTr: "ASİSTAN (Tek kullanıcı)",
  maxUsers: 1,
  status: "trialing" as const,
  trialDaysDefault: 14,
}

/** Üst şerit (Navbar): deneme bitimine bu kadar gün veya daha az kaldığında gösterilir (≤0 = süresi doldu). */
export const TRIAL_BANNER_WARNING_DAYS = 3

/**
 * max_users: toplam koltuk (işletme sahibi 1 + çalışanlar).
 * Yeni çalışan eklenebilir mi: mevcut çalışan sayısı < max_users - 1
 */
export function canAddEmployees(employeeCount: number, maxUsers: number): boolean {
  if (maxUsers < 1) return false
  return employeeCount < maxUsers - 1
}

export function trialDaysRemaining(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null
  const end = new Date(trialEndsAt).getTime()
  if (Number.isNaN(end)) return null
  return Math.ceil((end - Date.now()) / 86_400_000)
}
