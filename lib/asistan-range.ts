import {
  addDays,
  addMilliseconds,
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfDay,
  endOfMonth,
  endOfYear,
  format,
  getDate,
  getYear,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
  subYears,
} from "date-fns"
import { tr } from "date-fns/locale"

export type AsistanDatePreset =
  | "today"
  | "this_week"
  | "this_month"
  | "this_year"
  | "last_month"
  | "last_year"

export const ASISTAN_PRESET_LABELS: Record<AsistanDatePreset, string> = {
  today: "Bugün",
  this_week: "Bu hafta",
  this_month: "Bu ay",
  this_year: "Bu yıl",
  last_month: "Geçen ay",
  last_year: "Geçen yıl",
}

/** Pazartesi başlangıçlı hafta (TR) */
function startOfWeekMon(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  return startOfDay(addDays(d, diff))
}

function endOfWeekMon(d: Date): Date {
  return endOfDay(addDays(startOfWeekMon(d), 6))
}

export type DashboardRange = {
  preset: AsistanDatePreset
  start: Date
  end: Date
  prevStart: Date
  prevEnd: Date
  /** تاریخ شروع برای فیلتر appointment_date (YYYY-MM-DD) */
  apptStart: string
  apptEnd: string
  prevApptStart: string
  prevApptEnd: string
}

export function getDashboardRange(
  preset: AsistanDatePreset,
  now = new Date()
): DashboardRange {
  let start: Date
  let end: Date

  switch (preset) {
    case "today":
      start = startOfDay(now)
      end = endOfDay(now)
      break
    case "this_week":
      start = startOfWeekMon(now)
      end = endOfWeekMon(now)
      break
    case "this_month":
      start = startOfMonth(now)
      end = endOfMonth(now)
      break
    case "this_year":
      start = startOfYear(now)
      end = endOfYear(now)
      break
    case "last_month": {
      const ref = subMonths(now, 1)
      start = startOfMonth(ref)
      end = endOfMonth(ref)
      break
    }
    case "last_year": {
      const ref = subYears(now, 1)
      start = startOfYear(ref)
      end = endOfYear(ref)
      break
    }
    default:
      start = startOfWeekMon(now)
      end = endOfWeekMon(now)
  }

  const len = end.getTime() - start.getTime()
  const prevEnd = addMilliseconds(start, -1)
  const prevStart = new Date(prevEnd.getTime() - len)

  return {
    preset,
    start,
    end,
    prevStart,
    prevEnd,
    apptStart: format(start, "yyyy-MM-dd"),
    apptEnd: format(end, "yyyy-MM-dd"),
    prevApptStart: format(prevStart, "yyyy-MM-dd"),
    prevApptEnd: format(prevEnd, "yyyy-MM-dd"),
  }
}

export type BarPoint = { name: string; buDonem: number; oncekiDonem: number }

export type BarWindow = {
  curStart: Date
  curEnd: Date
  prevStart: Date
  prevEnd: Date
}

/** Bugün: 7 günlük trend; diğer preset'lerde ana dashboard aralığı */
export function getBarChartWindow(
  preset: AsistanDatePreset,
  range: DashboardRange,
  now = new Date()
): BarWindow {
  if (preset === "today") {
    const curEnd = endOfDay(now)
    const curStart = startOfDay(subDays(now, 6))
    const prevEnd = endOfDay(subDays(now, 7))
    const prevStart = startOfDay(subDays(now, 13))
    return { curStart, curEnd, prevStart, prevEnd }
  }
  return {
    curStart: range.start,
    curEnd: range.end,
    prevStart: range.prevStart,
    prevEnd: range.prevEnd,
  }
}

/** TR gün adları: ilk harf büyük (Pazartesi, Salı, …) */
function capitalizeTrDay(s: string) {
  if (!s) return s
  return s.charAt(0).toLocaleUpperCase("tr-TR") + s.slice(1)
}

function capitalizeTrMonth(s: string) {
  return capitalizeTrDay(s)
}

type PayPoint = { paidAt: Date; amount: number }

function groupAmountByDay(pays: PayPoint[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const p of pays) {
    const k = format(startOfDay(p.paidAt), "yyyy-MM-dd")
    m.set(k, (m.get(k) ?? 0) + p.amount)
  }
  return m
}

function sumDayRange(byDay: Map<string, number>, start: Date, end: Date): number {
  let s = 0
  for (const d of eachDayOfInterval({ start, end })) {
    s += byDay.get(format(d, "yyyy-MM-dd")) ?? 0
  }
  return s
}

/** Lijst metinleri: seçilen periyot ve önceki karşılık (tahsilat/gelir — ödeme tarihi) */
export function formatBarLegend(
  preset: AsistanDatePreset,
  barW: BarWindow,
  now = new Date()
): { prev: string; cur: string } {
  const span = (a: Date, b: Date) =>
    `${format(a, "d MMM", { locale: tr })} - ${format(b, "d MMM yyyy", { locale: tr })}`

  if (preset === "today") {
    const t = startOfDay(now)
    const y = subDays(t, 1)
    return {
      prev: format(y, "d MMMM yyyy", { locale: tr }),
      cur: format(t, "d MMMM yyyy", { locale: tr }),
    }
  }

  return {
    prev: span(barW.prevStart, barW.prevEnd),
    cur: span(barW.curStart, barW.curEnd),
  }
}

/**
 * Gelir Dağılımı (Satış): preset'e göre X ekseni + önceki dönem (koyu) / bu dönem (açık mavi) çift seri.
 * `pays`: bar penceresi içindeki tüm ödemeler (prev+cur tarihleri kapsayan).
 */
export function buildIncomeBarSeries(
  pays: PayPoint[],
  preset: AsistanDatePreset,
  range: DashboardRange,
  barW: BarWindow,
  now = new Date()
): BarPoint[] {
  const byDay = groupAmountByDay(pays)

  if (preset === "today") {
    const t0 = startOfDay(now)
    const y0 = subDays(t0, 1)
    const buDonem = byDay.get(format(t0, "yyyy-MM-dd")) ?? 0
    const oncekiDonem = byDay.get(format(y0, "yyyy-MM-dd")) ?? 0
    return [
      {
        name: capitalizeTrDay(format(t0, "d MMMM yyyy", { locale: tr })),
        buDonem,
        oncekiDonem,
      },
    ]
  }

  if (
    preset === "this_week" ||
    preset === "this_month" ||
    preset === "last_month"
  ) {
    const days = eachDayOfInterval({ start: range.start, end: range.end })
    const points: BarPoint[] = []
    let pairPrev: (d: Date) => Date
    if (preset === "this_week") pairPrev = (d) => subDays(d, 7)
    else pairPrev = (d) => subMonths(d, 1)

    for (const d of days) {
      const pk = format(d, "yyyy-MM-dd")
      let label: string
      if (preset === "this_week") {
        label = capitalizeTrDay(format(d, "EEEE", { locale: tr }))
      } else {
        label = String(getDate(d))
      }
      const prevD = pairPrev(d)
      points.push({
        name: label,
        buDonem: byDay.get(pk) ?? 0,
        oncekiDonem: byDay.get(format(prevD, "yyyy-MM-dd")) ?? 0,
      })
    }
    return points
  }

  if (preset === "this_year" || preset === "last_year") {
    const ySel = getYear(range.start)
    const yearBu = ySel
    const yearPrev = yearBu - 1
    const months = eachMonthOfInterval({
      start: startOfYear(new Date(yearBu, 0, 1)),
      end: endOfYear(new Date(yearBu, 0, 1)),
    })
    return months.map((m) => {
      const bs = startOfMonth(m)
      const be = endOfMonth(m)
      const ps = startOfMonth(new Date(yearPrev, m.getMonth(), 1))
      const pe = endOfMonth(new Date(yearPrev, m.getMonth(), 1))
      return {
        name: capitalizeTrMonth(format(m, "LLLL", { locale: tr })),
        buDonem: sumDayRange(byDay, bs, be),
        oncekiDonem: sumDayRange(byDay, ps, pe),
      }
    })
  }

  /** fallback */
  const days = eachDayOfInterval({ start: barW.curStart, end: barW.curEnd })
  const prevDays = eachDayOfInterval({ start: barW.prevStart, end: barW.prevEnd })
  const n = Math.min(days.length, prevDays.length, 31)
  const pts: BarPoint[] = []
  for (let i = 0; i < n; i++) {
    const d = days[i]!
    const pd = prevDays[i]!
    pts.push({
      name:
        n <= 7
          ? capitalizeTrDay(format(d, "EEEE", { locale: tr }))
          : format(d, "EEE", { locale: tr }),
      buDonem: byDay.get(format(d, "yyyy-MM-dd")) ?? 0,
      oncekiDonem: byDay.get(format(pd, "yyyy-MM-dd")) ?? 0,
    })
  }
  return pts
}
