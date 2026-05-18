import type { SupabaseClient } from "@supabase/supabase-js"

export type AppointmentSlot = {
  date: string
  start: string
  end: string
  employeeId?: string | null
  locationId?: string | null
  excludeAppointmentId?: string
}

type ExistingRow = {
  id?: string
  start_time: string
  end_time: string
  employee_id?: string | null
  location_id?: string | null
}

function hm(t: string) {
  return t.slice(0, 5)
}

export function timesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const as = hm(startA)
  const ae = hm(endA)
  const bs = hm(startB)
  const be = hm(endB)
  return as < be && ae > bs
}

export function slotConflictsWithExisting(
  slot: AppointmentSlot,
  existing: ExistingRow
): boolean {
  if (slot.excludeAppointmentId && existing.id === slot.excludeAppointmentId) {
    return false
  }
  if (!timesOverlap(slot.start, slot.end, existing.start_time, existing.end_time)) {
    return false
  }
  if (slot.employeeId && existing.employee_id === slot.employeeId) return true
  if (slot.locationId && existing.location_id === slot.locationId) return true
  return false
}

/** Aynı listedeki slotlar arası çakışma (planlama önizlemesi). */
export function hasInternalSlotConflicts(slots: AppointmentSlot[]): boolean {
  const valid = slots.filter((s) => s.date && s.start && s.end)
  for (let i = 0; i < valid.length; i++) {
    for (let j = i + 1; j < valid.length; j++) {
      if (valid[i].date !== valid[j].date) continue
      if (!timesOverlap(valid[i].start, valid[i].end, valid[j].start, valid[j].end)) {
        continue
      }
      const e1 = valid[i].employeeId
      const e2 = valid[j].employeeId
      const l1 = valid[i].locationId
      const l2 = valid[j].locationId
      if (e1 && e2 && e1 === e2) return true
      if (l1 && l2 && l1 === l2) return true
    }
  }
  return false
}

export async function hasAppointmentConflicts(
  supabase: SupabaseClient,
  slots: AppointmentSlot[]
): Promise<boolean> {
  if (hasInternalSlotConflicts(slots)) return true

  for (const slot of slots) {
    if (!slot.date || !slot.start || !slot.end) continue
    if (!slot.employeeId && !slot.locationId) continue

    const { data: existing } = await supabase
      .from("appointments")
      .select("id,start_time,end_time,employee_id,location_id")
      .eq("appointment_date", slot.date)
      .neq("status", "iptal")

    for (const ex of existing || []) {
      if (slotConflictsWithExisting(slot, ex)) return true
    }
  }
  return false
}
