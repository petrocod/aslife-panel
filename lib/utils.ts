import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks } from "date-fns"
import { tr } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = "TRY"): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateString: string, formatStr = "dd.MM.yyyy"): string {
  try {
    return format(parseISO(dateString), formatStr, { locale: tr })
  } catch {
    return dateString
  }
}

export function formatTime(timeString: string): string {
  return timeString.substring(0, 5)
}

export function getWeekDays(date: Date = new Date()) {
  const start = startOfWeek(date, { weekStartsOn: 1 })
  const end = endOfWeek(date, { weekStartsOn: 1 })
  return eachDayOfInterval({ start, end })
}

export function getNextWeek(date: Date): Date {
  return addWeeks(date, 1)
}

export function getPrevWeek(date: Date): Date {
  return subWeeks(date, 1)
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "approved":
      return "bg-blue-500"
    case "pending":
      return "bg-yellow-500"
    case "cancelled":
      return "bg-red-500"
    case "completed":
      return "bg-green-500"
    default:
      return "bg-gray-500"
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "approved":
      return "Onaylandı"
    case "pending":
      return "Beklemede"
    case "cancelled":
      return "İptal edildi"
    case "completed":
      return "Tamamlandı"
    default:
      return status
  }
}

export const DAY_NAMES = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"]
export const DAY_NAMES_FULL = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]

export const HOURS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, "0")
  return `${hour}:00`
})

export const REMINDER_OPTIONS = [
  { value: "12_hours", label: "12 Saat" },
  { value: "1_day", label: "1 Gün" },
  { value: "2_days", label: "2 Gün" },
  { value: "3_days", label: "3 Gün" },
  { value: "4_days", label: "4 Gün" },
]

export const USAGE_PERIOD_OPTIONS = [
  { value: "none", label: "Kullanım süresi yok" },
  { value: "custom", label: "Özel Kullanım Süresi" },
  { value: "1_week", label: "1 Hafta" },
  { value: "2_weeks", label: "2 Hafta" },
  { value: "3_weeks", label: "3 Hafta" },
]
