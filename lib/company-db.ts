import type { SupabaseClient } from "@supabase/supabase-js"

/** Alanlar: supabase/schema.sql + logo_url (uygulama) */
export const COMPANY_TABLE_FIELDS = [
  "name",
  "phone",
  "email",
  "address",
  "location",
  "authorized",
  "founded_at",
  "website",
  "tc_no",
  "tax_number",
  "tax_office",
  "invoice_address",
  "currency",
  "service_type",
  "language",
  "timezone",
  "logo_url",
] as const

export type CompanyTableField = (typeof COMPANY_TABLE_FIELDS)[number]

const SELECT_PROTECTED: readonly string[] = ["name"]

/**
 * PostgREST / Supabase "schema cache" ve PostgreSQL undefined column mesajları.
 */
export function parseMissingCompanyColumn(message: string): string | null {
  if (!message) return null
  const a = /Could not find the '([^']+)' column/i.exec(message)
  if (a?.[1]) return a[1]
  const b = /column "([^"]+)" does not exist/i.exec(message)
  if (b?.[1]) return b[1]
  const c = /column (\w+) does not exist/i.exec(message)
  if (c?.[1]) return c[1]
  return null
}

export async function selectCompanyRow(
  client: SupabaseClient,
  companyId: string,
): Promise<{ data: Record<string, unknown> | null; error: { message: string; code?: string } | null }> {
  let fields = [...COMPANY_TABLE_FIELDS] as string[]
  for (let attempt = 0; attempt < 30; attempt++) {
    const sel = fields.join(", ")
    const { data, error } = await client.from("companies").select(sel).eq("id", companyId).maybeSingle()
    if (!error) {
      if (data != null) {
        return { data: data as unknown as Record<string, unknown>, error: null }
      }
      return {
        data: null,
        error: {
          code: "EMPTY_RESULT",
          message:
            "Şirket satırı dönmedi (kayıt yok, yanlış UUID veya RLS seçimi engelliyor).",
        },
      }
    }
    const col = parseMissingCompanyColumn(error.message || "")
    if (col && fields.includes(col) && !SELECT_PROTECTED.includes(col)) {
      fields = fields.filter((f) => f !== col)
      if (fields.length === 0) {
        return { data: null, error: { message: error.message } }
      }
      continue
    }
    return { data: null, error: { message: error.message } }
  }
  return { data: null, error: { message: "Şirket seçimi: çok fazla deneme." } }
}

/** İstemciden: service_role ile şirket yükler (RLS sorununu aşar). */
export async function loadCompanyViaApi(accessToken: string): Promise<{
  company: Record<string, unknown> | null
  error: string | null
  code?: string
  status: number
}> {
  try {
    const res = await fetch("/api/company-me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const j = (await res.json().catch(() => ({}))) as {
      company?: Record<string, unknown> | null
      error?: string
      code?: string
    }
    if (res.ok) {
      return {
        company: (j.company ?? null) as Record<string, unknown> | null,
        error: null,
        status: res.status,
      }
    }
    return {
      company: null,
      error: j.error || `HTTP ${res.status}`,
      code: j.code,
      status: res.status,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { company: null, error: msg, code: "NETWORK", status: 0 }
  }
}

/**
 * Önce /api/company-me (service_role), olmazsa doğrudan Supabase istemcisi.
 */
export async function loadCompanyBestEffort(
  client: SupabaseClient,
  companyId: string,
): Promise<{ data: Record<string, unknown> | null; error: string | null }> {
  const {
    data: { session },
  } = await client.auth.getSession()

  if (session?.access_token) {
    const api = await loadCompanyViaApi(session.access_token)
    if (api.company) {
      return { data: normalizeCompanyRow(api.company), error: null }
    }
    if (api.code === "NETWORK" || api.status === 0) {
      const direct = await selectCompanyRow(client, companyId)
      if (direct.data) return { data: normalizeCompanyRow(direct.data), error: null }
      return { data: null, error: direct.error?.message ?? api.error }
    }
    if (api.code === "NO_SERVICE_ROLE" || api.status === 503) {
      const direct = await selectCompanyRow(client, companyId)
      if (direct.data) return { data: normalizeCompanyRow(direct.data), error: null }
      return { data: null, error: direct.error?.message ?? api.error }
    }
    if (api.status === 404) {
      const direct = await selectCompanyRow(client, companyId)
      if (direct.data) return { data: normalizeCompanyRow(direct.data), error: null }
      return { data: null, error: api.error }
    }
    const direct = await selectCompanyRow(client, companyId)
    if (direct.data) return { data: normalizeCompanyRow(direct.data), error: null }
    return { data: null, error: api.error }
  }

  const direct = await selectCompanyRow(client, companyId)
  if (direct.data) return { data: normalizeCompanyRow(direct.data), error: null }
  return { data: null, error: direct.error?.message ?? null }
}

export function normalizeCompanyRow(data: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!data) return null
  const out: Record<string, unknown> = { ...data }
  for (const f of COMPANY_TABLE_FIELDS) {
    if (!(f in out)) out[f] = null
  }
  return out
}

/** Kayıt: önce PUT /api/company-me (RLS bypass), olmazsa istemci update. */
export async function saveCompanyBestEffort(
  client: SupabaseClient,
  companyId: string,
  payload: Record<string, unknown>,
): Promise<{ error: string | null; strippedColumns: string[] }> {
  const {
    data: { session },
  } = await client.auth.getSession()

  if (session?.access_token) {
    const res = await fetch("/api/company-me", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
    const j = (await res.json().catch(() => ({}))) as {
      error?: string
      strippedColumns?: string[]
      code?: string
    }
    if (res.ok) {
      return { error: null, strippedColumns: j.strippedColumns ?? [] }
    }
    if (res.status === 503 && j.code === "NO_SERVICE_ROLE") {
      const r = await updateCompanyRowWithFallback(client, companyId, payload)
      return { error: r.error?.message ?? null, strippedColumns: r.strippedColumns }
    }
    return { error: j.error ?? `HTTP ${res.status}`, strippedColumns: [] }
  }

  const r = await updateCompanyRowWithFallback(client, companyId, payload)
  return { error: r.error?.message ?? null, strippedColumns: r.strippedColumns }
}

export async function updateCompanyRowWithFallback(
  client: SupabaseClient,
  companyId: string,
  payload: Record<string, unknown>,
): Promise<{ error: { message: string } | null; strippedColumns: string[] }> {
  const row: Record<string, unknown> = { ...payload }
  const stripped: string[] = []
  for (let attempt = 0; attempt < 30; attempt++) {
    const { error } = await client.from("companies").update(row).eq("id", companyId)
    if (!error) return { error: null, strippedColumns: stripped }
    const col = parseMissingCompanyColumn(error.message || "")
    if (col && col in row) {
      delete row[col]
      stripped.push(col)
      continue
    }
    return { error: { message: error.message }, strippedColumns: stripped }
  }
  return { error: { message: "Güncelleme: çok fazla deneme." }, strippedColumns: stripped }
}
