import { addDays, format } from "date-fns"

/** یک روز: الگوی شرکت، per کارمند، یا به‌تاریخ – با ترتیب اولویت در `resolveWorkDay` */
export type WorkDayRow = {
  day_of_week: number
  is_open: boolean
  start_time: string | null
  end_time: string | null
}

export type DayForm = { is_open: boolean; start_time: string; end_time: string }

/** سفارش روز هفته مثل Calisma: Pazartesi..Pazar */
export const DOW_TR_ORDER: readonly number[] = [1, 2, 3, 4, 5, 6, 0]

export function timeToMins(t: string): number {
  const [h, m] = t.split(":").map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0
  return h * 60 + m
}

export function ymdToLocalDate(ymd: string): Date {
  const p = ymd.split("-").map(Number)
  const y = p[0]!
  const mo = p[1]!
  const d = p[2]!
  return new Date(y, mo - 1, d)
}

/** weekStart = Pazartesi; dow = 0–6 (getDay) */
export function dateForDowInWeek(weekStartMonday: Date, dow: number): Date {
  return addDays(weekStartMonday, dow === 0 ? 6 : dow - 1)
}

/** ۱) by_date ۲) الگوی هفتگی کارمند ۳) ساعات شرکت */
export function resolveWorkDay(
  employeeId: string,
  d: Date,
  company: Record<number, WorkDayRow>,
  empByEid: Record<string, Record<number, WorkDayRow>>,
  byDate: Record<string, WorkDayRow>
): WorkDayRow | null {
  const ymd = format(d, "yyyy-MM-dd")
  const dk = `${employeeId}__${ymd}`
  const o = byDate[dk]
  if (o) {
    return { ...o, day_of_week: d.getDay() }
  }
  const dow = d.getDay()
  const em = empByEid[employeeId]?.[dow]
  if (em) return em
  return company[dow] ?? null
}

export function buildFormFromResolve(
  empId: string,
  weekStartMonday: Date,
  company: Record<number, WorkDayRow>,
  empByEid: Record<string, Record<number, WorkDayRow>>,
  byDate: Record<string, WorkDayRow>
): Record<number, DayForm> {
  const out: Record<number, DayForm> = {}
  const defClosed: DayForm = { is_open: false, start_time: "09:00", end_time: "18:00" }
  for (const dow of DOW_TR_ORDER) {
    const dayDate = dateForDowInWeek(weekStartMonday, dow)
    const r = resolveWorkDay(empId, dayDate, company, empByEid, byDate)
    if (!r) {
      out[dow] = { ...defClosed }
    } else {
      out[dow] = {
        is_open: Boolean(r.is_open),
        start_time: r.start_time ? String(r.start_time).slice(0, 5) : "09:00",
        end_time: r.end_time ? String(r.end_time).slice(0, 5) : "18:00",
      }
    }
  }
  return out
}

const FALLBACK: { startMins: number; endMins: number } = { startMins: 9 * 60, endMins: 18 * 60 }

/**
 * کادر زمانی نمایش تقویم وقتی چند کارمند (یا فیلتر) درگیر‌اند: حداقل شروع / حداکر پایان
 * روز «همه بسته و بدون الگو» → شرکت (همان DOW) → پیش‌فرض ۹–۱۸
 */
export function dayEnvelopeMins(
  relevantEmployeeIds: string[],
  day: Date,
  company: Record<number, WorkDayRow>,
  empByEid: Record<string, Record<number, WorkDayRow>>,
  byDate: Record<string, WorkDayRow>
): { startMins: number; endMins: number } {
  let minS = Number.POSITIVE_INFINITY
  let maxE = Number.NEGATIVE_INFINITY
  for (const eid of relevantEmployeeIds) {
    const r = resolveWorkDay(eid, day, company, empByEid, byDate)
    if (r && r.is_open && r.start_time && r.end_time) {
      const s = timeToMins(String(r.start_time).slice(0, 5))
      const e = timeToMins(String(r.end_time).slice(0, 5))
      if (e > s) {
        minS = Math.min(minS, s)
        maxE = Math.max(maxE, e)
      }
    }
  }
  if (minS !== Number.POSITIVE_INFINITY) {
    return { startMins: minS, endMins: maxE }
  }
  const dow = day.getDay()
  const c = company[dow]
  if (c && c.is_open && c.start_time && c.end_time) {
    return {
      startMins: timeToMins(String(c.start_time).slice(0, 5)),
      endMins: timeToMins(String(c.end_time).slice(0, 5)),
    }
  }
  return { ...FALLBACK }
}

/** یک کارمند، یک روز: بازه «چارتر» رندو و محدوده انتخاب زمان */
export function resolvedIntervalForEmployee(
  employeeId: string,
  day: Date,
  company: Record<number, WorkDayRow>,
  empByEid: Record<string, Record<number, WorkDayRow>>,
  byDate: Record<string, WorkDayRow>
): { start: string; end: string } | null {
  const r = resolveWorkDay(employeeId, day, company, empByEid, byDate)
  if (!r || !r.is_open || !r.start_time || !r.end_time) return null
  return { start: String(r.start_time).slice(0, 5), end: String(r.end_time).slice(0, 5) }
}
