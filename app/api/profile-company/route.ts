import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { parseMissingCompanyColumn } from "@/lib/company-db"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

/**
 * Oturum açmış, henüz company_id olmayan kullanıcı için yeni şirket kaydı + profil bağlantısı.
 * .env.local: SUPABASE_SERVICE_ROLE_KEY gerekli.
 * Mevcut bir şirkete bağlanmak için: Hesabım → Profil (tarayıcıdan profiles güncellemesi, RLS izin verir).
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Oturum gerekli (Authorization: Bearer)." }, { status: 401 })
  }

  const token = authHeader.slice(7).trim()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    return NextResponse.json({ error: "Supabase URL/anon key eksik." }, { status: 500 })
  }

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })

  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser()
  if (userErr || !user) {
    return NextResponse.json({ error: "Geçersiz oturum." }, { status: 401 })
  }

  type Body = {
    companyName?: string
    phone?: string
    email?: string
    address?: string
    location?: string
    authorized?: string
    founded_at?: string | null
    website?: string
    tc_no?: string
    tax_number?: string
    tax_office?: string
    invoice_address?: string
    currency?: string
    service_type?: string
    language?: string
    timezone?: string
    logo_url?: string | null
  }

  let body: Body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON." }, { status: 400 })
  }

  const companyName = body.companyName?.trim()
  if (!companyName) {
    return NextResponse.json({ error: "Şirket ünvanı (companyName) zorunludur." }, { status: 400 })
  }

  let admin: ReturnType<typeof getSupabaseAdmin>
  try {
    admin = getSupabaseAdmin()
  } catch {
    return NextResponse.json(
      {
        error:
          "SUPABASE_SERVICE_ROLE_KEY tanımlı değil. .env.local ekleyip sunucuyu yeniden başlatın veya Supabase’te mevcut companies.id ile profili elle bağlayın.",
        code: "NO_SERVICE_ROLE",
      },
      { status: 503 },
    )
  }

  const { data: profile, error: pErr } = await admin
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (pErr) {
    return NextResponse.json({ error: pErr.message }, { status: 500 })
  }

  if (profile?.company_id) {
    return NextResponse.json({ error: "Profil zaten bir şirkete bağlı." }, { status: 400 })
  }

  const insertRow: Record<string, unknown> = {
    name: companyName,
    phone: body.phone?.trim() || null,
    email: body.email?.trim() || null,
    address: body.address?.trim() || null,
    location: body.location?.trim() || null,
    authorized: body.authorized?.trim() || null,
    founded_at: body.founded_at?.trim() || null,
    website: body.website?.trim() || null,
    tc_no: body.tc_no?.trim() || null,
    tax_number: body.tax_number?.trim() || null,
    tax_office: body.tax_office?.trim() || null,
    invoice_address: body.invoice_address?.trim() || null,
    currency: body.currency?.trim() || "TRY",
    service_type: body.service_type?.trim() || "Sağlık Merkezi",
    language: body.language?.trim() || "tr",
    timezone: body.timezone?.trim() || "Europe/Istanbul",
  }
  const logoTrim = body.logo_url?.trim()
  if (logoTrim) insertRow.logo_url = logoTrim

  const row: Record<string, unknown> = { ...insertRow }
  type InsOk = { data: { id: string } | null; error: { message: string; code?: string } | null }
  let ins = (await admin
    .from("companies")
    .insert(row as never)
    .select("id")
    .single()) as InsOk
  let attempts = 0
  while (ins.error && !ins.data?.id && attempts < 30) {
    attempts += 1
    const msg = ins.error.message || ""
    const col = parseMissingCompanyColumn(msg)
    if (col && col in row) {
      delete row[col]
      ins = (await admin
        .from("companies")
        .insert(row as never)
        .select("id")
        .single()) as InsOk
      continue
    }
    break
  }

  if (ins.error || !ins.data?.id) {
    return NextResponse.json({ error: ins.error?.message || "Şirket oluşturulamadı." }, { status: 400 })
  }

  const newId = ins.data.id

  // Create organization for the new company
  const { data: orgData } = await admin
    .from("organizations")
    .insert({ name: companyName, owner_email: user.email || null })
    .select("id")
    .single()

  const orgId = orgData?.id || null

  if (orgId) {
    await admin.from("companies").update({ organization_id: orgId }).eq("id", newId)
    await admin.from("organization_members").insert({
      organization_id: orgId,
      user_id: user.id,
      role: "owner",
      status: "active",
      accepted_at: new Date().toISOString(),
    })
  }

  const hours = Array.from({ length: 7 }, (_, d) => ({
    company_id: newId,
    day_of_week: d,
    is_open: d < 6,
    start_time: "09:00",
    end_time: "18:00",
  }))
  await admin.from("settings").insert({ company_id: newId })
  await admin.from("working_hours").insert(hours)

  const meta = user.user_metadata as { full_name?: string } | undefined
  const fullName =
    (typeof meta?.full_name === "string" && meta.full_name.trim()) ||
    user.email?.split("@")[0]?.trim() ||
    "Kullanıcı"

  const { data: updatedRow, error: uErr } = await admin
    .from("profiles")
    .update({ company_id: newId, organization_id: orgId })
    .eq("id", user.id)
    .select("id")
    .maybeSingle()

  if (uErr) {
    return NextResponse.json(
      { error: `${uErr.message} (şirket oluşturuldu; profil güncellenemedi.)` },
      { status: 500 },
    )
  }

  if (!updatedRow) {
    const { error: insErr } = await admin.from("profiles").insert({
      id: user.id,
      company_id: newId,
      organization_id: orgId,
      full_name: fullName,
      email: user.email ?? "",
    })
    if (insErr) {
      return NextResponse.json(
        { error: `${insErr.message} (şirket oluşturuldu; profiles satırı yoktu ve eklenemedi — şema veya RLS kontrol edin.)` },
        { status: 500 },
      )
    }
  }

  return NextResponse.json({ ok: true, companyId: newId, organizationId: orgId })
}
