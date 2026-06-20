import type { SupabaseClient } from "@supabase/supabase-js"

export const PROFILE_COLUMNS =
  "id, full_name, email, phone, role, created_at, updated_at, company_id, organization_id"

export type AdminUserRow = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  role: string | null
  created_at: string
  updated_at: string
  company_id: string | null
  organization_id: string | null
  is_active: boolean
  last_login: string | null
  companies: { id: string; name: string } | null
  organizations: { id: string; name: string } | null
}

export function generateTempPassword(): string {
  return Math.random().toString(36).slice(-10) + "A1!"
}

export async function enrichAdminUsers(
  supabase: SupabaseClient,
  profiles: Record<string, unknown>[]
): Promise<AdminUserRow[]> {
  if (!profiles.length) return []

  const companyIds = [
    ...new Set(
      profiles.map((p) => p.company_id as string | null).filter(Boolean) as string[]
    ),
  ]
  const orgIds = [
    ...new Set(
      profiles
        .map((p) => p.organization_id as string | null)
        .filter(Boolean) as string[]
    ),
  ]

  const [companiesRes, orgsRes] = await Promise.all([
    companyIds.length
      ? supabase.from("companies").select("id, name").in("id", companyIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    orgIds.length
      ? supabase.from("organizations").select("id, name").in("id", orgIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ])

  const companyMap = new Map((companiesRes.data || []).map((c) => [c.id, c]))
  const orgMap = new Map((orgsRes.data || []).map((o) => [o.id, o]))

  const authMeta = await Promise.all(
    profiles.map(async (p) => {
      const id = String(p.id)
      try {
        const { data } = await supabase.auth.admin.getUserById(id)
        const user = data.user
        const bannedUntil = user?.banned_until
        const isBanned =
          !!bannedUntil &&
          bannedUntil !== "none" &&
          new Date(bannedUntil) > new Date()
        return {
          id,
          is_active: !isBanned,
          last_login: user?.last_sign_in_at || null,
        }
      } catch {
        return { id, is_active: true, last_login: null }
      }
    })
  )
  const authMap = new Map(authMeta.map((a) => [a.id, a]))

  return profiles.map((p) => {
    const id = String(p.id)
    const companyId = (p.company_id as string | null) || null
    const orgId = (p.organization_id as string | null) || null
    const auth = authMap.get(id)

    return {
      id,
      full_name: (p.full_name as string | null) ?? null,
      email: (p.email as string | null) ?? null,
      phone: (p.phone as string | null) ?? null,
      role: (p.role as string | null) ?? null,
      created_at: String(p.created_at),
      updated_at: String(p.updated_at),
      company_id: companyId,
      organization_id: orgId,
      is_active: auth?.is_active ?? true,
      last_login: auth?.last_login ?? null,
      companies: companyId ? companyMap.get(companyId) || null : null,
      organizations: orgId ? orgMap.get(orgId) || null : null,
    }
  })
}

export async function upsertUserProfile(
  supabase: SupabaseClient,
  input: {
    userId: string
    email: string
    fullName?: string
    phone?: string
    companyId: string
    role?: string
  }
) {
  const { data: company } = await supabase
    .from("companies")
    .select("organization_id")
    .eq("id", input.companyId)
    .maybeSingle()

  const now = new Date().toISOString()
  const row = {
    id: input.userId,
    company_id: input.companyId,
    organization_id: company?.organization_id || null,
    full_name: input.fullName?.trim() || "",
    email: input.email.trim().toLowerCase(),
    phone: input.phone?.trim() || "",
    role: input.role || "member",
    updated_at: now,
  }

  const { error } = await supabase.from("profiles").upsert(row, { onConflict: "id" })
  return error
}
