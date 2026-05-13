export type PurchaseOperator = "eq" | "gt" | "lt" | "between"

export type TargetAudienceFilters = {
  time?: {
    startDate?: string
    endDate?: string
  }
  customer?: {
    hasAppointments?: boolean
    noAppointments?: boolean
    gender?: "male" | "female" | "other"
  }
  services?: {
    serviceIds?: string[]
    packageIds?: string[]
  }
  visitFrequency?: {
    min?: number
    max?: number
  }
  purchaseAmount?: {
    operator?: PurchaseOperator
    value?: number
    min?: number
    max?: number
  }
  location?: {
    country?: string
    city?: string
  }
  selectedCustomerIds?: string[]
}

export function defaultTargetAudienceFilters(): TargetAudienceFilters {
  return {
    time: {},
    customer: {},
    services: { serviceIds: [], packageIds: [] },
    visitFrequency: {},
    purchaseAmount: { operator: "eq" },
    location: {},
    selectedCustomerIds: [],
  }
}

export function safeParseFilters(input: unknown): TargetAudienceFilters {
  if (!input || typeof input !== "object") return defaultTargetAudienceFilters()
  return {
    ...defaultTargetAudienceFilters(),
    ...(input as TargetAudienceFilters),
  }
}

export function formatDateTR(dateStr?: string): string {
  if (!dateStr) return "-"
  try {
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return dateStr
    return new Intl.DateTimeFormat("tr-TR").format(d)
  } catch {
    return dateStr
  }
}

export function summarizeFilters(filters: TargetAudienceFilters): string[] {
  const out: string[] = []
  if (filters.time?.startDate || filters.time?.endDate) {
    out.push(`Özel Tarih ${formatDateTR(filters.time.startDate)} - ${formatDateTR(filters.time.endDate)}`)
  }
  if (filters.customer?.hasAppointments || filters.customer?.noAppointments || filters.customer?.gender) {
    const c: string[] = []
    if (filters.customer.hasAppointments) c.push("Randevu alanlar")
    if (filters.customer.noAppointments) c.push("Randevu almayanlar")
    if (filters.customer.gender === "male") c.push("Erkek")
    if (filters.customer.gender === "female") c.push("Kadın")
    if (filters.customer.gender === "other") c.push("Belirtmeyen")
    out.push(`Müşteri: ${c.join(", ")}`)
  }
  if ((filters.services?.serviceIds?.length || 0) > 0 || (filters.services?.packageIds?.length || 0) > 0) {
    out.push(
      `Hizmetler: ${(filters.services?.serviceIds?.length || 0)} | Paketler: ${(filters.services?.packageIds?.length || 0)}`
    )
  }
  if (filters.visitFrequency?.min !== undefined || filters.visitFrequency?.max !== undefined) {
    out.push(`Ziyaret Sıklığı: ${filters.visitFrequency.min ?? 0} - ${filters.visitFrequency.max ?? "∞"}`)
  }
  if (filters.purchaseAmount?.operator && (filters.purchaseAmount.value || filters.purchaseAmount.min || filters.purchaseAmount.max)) {
    out.push("Satın alma tutarı filtresi")
  }
  if (filters.location?.country || filters.location?.city) {
    out.push(`Lokasyon: ${filters.location.country || "—"} / ${filters.location.city || "—"}`)
  }
  return out
}
