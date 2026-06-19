import { DEMO_COMPANY_ID } from "@/lib/demo-limits"
import { supabase } from "@/lib/supabase-client"

export const DEMO_DATA_STORAGE_KEY = "inasistan-demo-data-on"

export type DemoSeedStats = {
  appointments: number
  payments: number
  customers: number
  employees: number
  services: number
  packages: number
}

async function authHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession()
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`
  }
  return headers
}

export async function fetchDemoDataStatus(): Promise<{
  hasData: boolean
  appointmentCount: number
}> {
  const res = await fetch(
    `/api/demo-seed?companyId=${encodeURIComponent(DEMO_COMPANY_ID)}`,
    { cache: "no-store" }
  )
  if (!res.ok) return { hasData: false, appointmentCount: 0 }
  return res.json()
}

export async function runDemoSeedOp(
  op: "seed" | "clear"
): Promise<{ ok: boolean; message?: string; stats?: DemoSeedStats; error?: string }> {
  const res = await fetch("/api/demo-seed", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ op, companyId: DEMO_COMPANY_ID }),
  })
  const data = await res.json()
  if (!res.ok) {
    return { ok: false, error: data?.error || "İstek başarısız" }
  }
  if (op === "clear") {
    return { ok: true, message: data.message || "Demo verileri silindi." }
  }
  return { ok: true, stats: data.stats as DemoSeedStats }
}
