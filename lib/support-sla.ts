/** Internal support SLA: first response within 24 hours. */

export const SUPPORT_SLA_HOURS = 24

export function computeSlaDueAt(createdAt: string | Date): string {
  const base = typeof createdAt === "string" ? new Date(createdAt) : createdAt
  return new Date(base.getTime() + SUPPORT_SLA_HOURS * 60 * 60 * 1000).toISOString()
}

export type SlaStatus = "ok" | "warning" | "breached"

export function getSlaStatus(slaDueAt: string | null, status: string): SlaStatus {
  if (!slaDueAt || status === "resolved" || status === "closed") return "ok"
  const due = new Date(slaDueAt).getTime()
  const now = Date.now()
  if (now > due) return "breached"
  if (due - now < 4 * 60 * 60 * 1000) return "warning"
  return "ok"
}

export const SUPPORT_REPLY_TEMPLATES: { id: string; label: string; body: string }[] = [
  {
    id: "received",
    label: "Talep alındı",
    body: "Merhaba,\n\nDestek talebinizi aldık. En geç 24 saat içinde size dönüş yapacağız.\n\nSaygılarımızla,\naSistan Destek",
  },
  {
    id: "investigating",
    label: "İnceleniyor",
    body: "Merhaba,\n\nKonuyu teknik ekibimize ilettik. İnceleme devam ediyor; kısa süre içinde güncelleyeceğiz.\n\nSaygılarımızla,\naSistan Destek",
  },
  {
    id: "resolved",
    label: "Çözüldü",
    body: "Merhaba,\n\nSorununuz çözüldü. Başka bir konuda yardıma ihtiyacınız olursa yeni bir destek talebi oluşturabilirsiniz.\n\nİyi çalışmalar,\naSistan Destek",
  },
  {
    id: "billing",
    label: "Ödeme / abonelik",
    body: "Merhaba,\n\nÖdeme veya abonelik konusunda Hesabım > Plan ve Ödeme bölümünü kontrol edebilirsiniz. Ek bilgi için fatura veya işlem referansını paylaşırsanız yardımcı oluruz.\n\nSaygılarımızla,\naSistan Destek",
  },
]
